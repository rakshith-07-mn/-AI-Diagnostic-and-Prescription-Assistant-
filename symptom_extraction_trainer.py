"""Symptom Extraction Model Trainer

This module provides functionality to train NLP models for symptom extraction
from medical text using transformer-based models.
"""

import os
import json
import pickle
import numpy as np
import pandas as pd
import torch
from pathlib import Path
from typing import Dict, List, Tuple, Any, Optional, Union
from sklearn.model_selection import train_test_split
from sklearn.metrics import classification_report, precision_recall_fscore_support

# Add the project root to the Python path
import sys
project_root = Path(__file__).parent.parent.absolute()
sys.path.insert(0, str(project_root))

from config import NLP_CONFIG, MODEL_CONFIG, PATHS

# Check if GPU is available
device = torch.device("cuda" if torch.cuda.is_available() else "cpu")


class SymptomExtractionTrainer:
    """Class for training NLP models for symptom extraction"""
    
    def __init__(self, model_name: str = NLP_CONFIG["transformer_model"], 
                 max_length: int = NLP_CONFIG["max_sequence_length"],
                 batch_size: int = MODEL_CONFIG["batch_size"],
                 learning_rate: float = MODEL_CONFIG["learning_rate"],
                 epochs: int = MODEL_CONFIG["epochs"],
                 output_dir: Optional[str] = None):
        """Initialize the symptom extraction trainer
        
        Args:
            model_name: Name of the transformer model to use
            max_length: Maximum sequence length for tokenization
            batch_size: Batch size for training
            learning_rate: Learning rate for training
            epochs: Number of epochs to train for
            output_dir: Directory to save trained models
        """
        self.model_name = model_name
        self.max_length = max_length
        self.batch_size = batch_size
        self.learning_rate = learning_rate
        self.epochs = epochs
        self.output_dir = output_dir or os.path.join(project_root, PATHS["models"])
        
        # Create output directory if it doesn't exist
        os.makedirs(self.output_dir, exist_ok=True)
        
        # Initialize tokenizer and model
        self.tokenizer = None
        self.model = None
        self.symptom_labels = None
        
        print(f"Initializing SymptomExtractionTrainer with model: {model_name}")
        print(f"Using device: {device}")
    
    def load_data(self, data_path: str) -> Tuple[List[str], List[List[Dict[str, Any]]], Dict[str, int]]:
        """Load symptom text data with annotations
        
        Args:
            data_path: Path to the symptom text data file
            
        Returns:
            Tuple of (texts, annotations, symptom_to_id)
        """
        print(f"Loading data from {data_path}")
        
        with open(data_path, 'r') as f:
            data = json.load(f)
        
        texts = [item["text"] for item in data]
        annotations = [item["annotations"] for item in data]
        
        # Create a mapping of symptom IDs to integer labels
        unique_symptoms = set()
        for ann_list in annotations:
            for ann in ann_list:
                unique_symptoms.add(ann["symptom_id"])
        
        symptom_to_id = {symptom_id: idx for idx, symptom_id in enumerate(sorted(unique_symptoms))}
        
        print(f"Loaded {len(texts)} texts with {len(unique_symptoms)} unique symptoms")
        
        return texts, annotations, symptom_to_id
    
    def prepare_ner_data(self, texts: List[str], annotations: List[List[Dict[str, Any]]], 
                        symptom_to_id: Dict[str, int]) -> List[Dict[str, Any]]:
        """Prepare data for named entity recognition (NER) training
        
        Args:
            texts: List of text samples
            annotations: List of annotation lists for each text
            symptom_to_id: Mapping of symptom IDs to integer labels
            
        Returns:
            List of NER examples in the required format
        """
        from transformers import AutoTokenizer
        
        # Initialize tokenizer if not already done
        if self.tokenizer is None:
            self.tokenizer = AutoTokenizer.from_pretrained(self.model_name)
        
        ner_examples = []
        
        for text, ann_list in zip(texts, annotations):
            # Initialize token labels with 'O' (outside any entity)
            labels = ['O'] * len(text)
            
            # Mark symptom entities with BIO tagging scheme
            for ann in ann_list:
                start, end = ann["start"], ann["end"]
                symptom_id = ann["symptom_id"]
                
                # Mark the beginning of the entity
                labels[start] = f"B-SYMPTOM"
                
                # Mark the inside of the entity
                for i in range(start + 1, end):
                    labels[i] = f"I-SYMPTOM"
            
            # Tokenize the text and align labels
            tokenized = self.tokenizer(text, return_offsets_mapping=True, truncation=True, 
                                      max_length=self.max_length)
            
            # Convert character-level labels to token-level labels
            token_labels = []
            for offset in tokenized["offset_mapping"]:
                if offset[0] == 0 and offset[1] == 0:  # Special tokens
                    token_labels.append('O')
                else:
                    # Use the label of the first character in the token
                    token_labels.append(labels[offset[0]])
            
            # Create the NER example
            ner_example = {
                "input_ids": tokenized["input_ids"],
                "attention_mask": tokenized["attention_mask"],
                "labels": token_labels
            }
            
            ner_examples.append(ner_example)
        
        print(f"Prepared {len(ner_examples)} NER examples")
        
        return ner_examples
    
    def prepare_classification_data(self, texts: List[str], annotations: List[List[Dict[str, Any]]], 
                                  symptom_to_id: Dict[str, int]) -> Tuple[List[str], np.ndarray]:
        """Prepare data for multi-label classification training
        
        Args:
            texts: List of text samples
            annotations: List of annotation lists for each text
            symptom_to_id: Mapping of symptom IDs to integer labels
            
        Returns:
            Tuple of (texts, labels)
        """
        num_symptoms = len(symptom_to_id)
        labels = np.zeros((len(texts), num_symptoms))
        
        for i, ann_list in enumerate(annotations):
            for ann in ann_list:
                symptom_id = ann["symptom_id"]
                if symptom_id in symptom_to_id:
                    labels[i, symptom_to_id[symptom_id]] = 1
        
        print(f"Prepared classification data with {labels.sum()} positive labels")
        
        return texts, labels
    
    def train_ner_model(self, ner_examples: List[Dict[str, Any]], 
                       val_split: float = 0.2) -> None:
        """Train a named entity recognition model for symptom extraction
        
        Args:
            ner_examples: List of NER examples
            val_split: Validation split ratio
        """
        from transformers import AutoModelForTokenClassification, TrainingArguments, Trainer
        from transformers import DataCollatorForTokenClassification
        import torch
        import datasets
        import numpy as np
        
        print("Training NER model for symptom extraction...")
        
        # Convert examples to datasets format
        dataset = datasets.Dataset.from_dict({
            "input_ids": [ex["input_ids"] for ex in ner_examples],
            "attention_mask": [ex["attention_mask"] for ex in ner_examples],
            "labels": [ex["labels"] for ex in ner_examples]
        })
        
        # Split into training and validation sets
        dataset = dataset.train_test_split(test_size=val_split)
        
        # Get unique labels and create label mapping
        unique_labels = set()
        for ex in ner_examples:
            unique_labels.update(ex["labels"])
        
        label_list = sorted(list(unique_labels))
        label_to_id = {label: i for i, label in enumerate(label_list)}
        id_to_label = {i: label for label, i in label_to_id.items()}
        
        # Save label mappings
        with open(os.path.join(self.output_dir, "ner_labels.json"), "w") as f:
            json.dump({"label_to_id": label_to_id, "id_to_label": id_to_label}, f)
        
        # Initialize model
        model = AutoModelForTokenClassification.from_pretrained(
            self.model_name, num_labels=len(label_list)
        )
        model.to(device)
        
        # Define training arguments
        training_args = TrainingArguments(
            output_dir=os.path.join(self.output_dir, "ner_checkpoints"),
            evaluation_strategy="epoch",
            learning_rate=self.learning_rate,
            per_device_train_batch_size=self.batch_size,
            per_device_eval_batch_size=self.batch_size,
            num_train_epochs=self.epochs,
            weight_decay=0.01,
            save_strategy="epoch",
            load_best_model_at_end=True,
        )
        
        # Define data collator
        data_collator = DataCollatorForTokenClassification(self.tokenizer)
        
        # Define metrics computation function
        def compute_metrics(eval_preds):
            logits, labels = eval_preds
            predictions = np.argmax(logits, axis=-1)
            
            # Remove ignored index (special tokens)
            true_labels = [[label_list[l] for l in label if l != -100] for label in labels]
            true_predictions = [
                [label_list[p] for (p, l) in zip(prediction, label) if l != -100]
                for prediction, label in zip(predictions, labels)
            ]
            
            # Flatten the predictions and labels
            flat_true_labels = [label for sublist in true_labels for label in sublist]
            flat_predictions = [pred for sublist in true_predictions for pred in sublist]
            
            # Compute metrics
            results = classification_report(flat_true_labels, flat_predictions, output_dict=True)
            
            return {
                "accuracy": results["accuracy"],
                "precision": results["weighted avg"]["precision"],
                "recall": results["weighted avg"]["recall"],
                "f1": results["weighted avg"]["f1-score"]
            }
        
        # Initialize trainer
        trainer = Trainer(
            model=model,
            args=training_args,
            train_dataset=dataset["train"],
            eval_dataset=dataset["test"],
            tokenizer=self.tokenizer,
            data_collator=data_collator,
            compute_metrics=compute_metrics
        )
        
        # Train the model
        trainer.train()
        
        # Evaluate the model
        eval_results = trainer.evaluate()
        print(f"Evaluation results: {eval_results}")
        
        # Save the model
        model_path = os.path.join(self.output_dir, "symptom_ner_model")
        trainer.save_model(model_path)
        self.tokenizer.save_pretrained(model_path)
        
        print(f"NER model saved to {model_path}")
    
    def train_classification_model(self, texts: List[str], labels: np.ndarray, 
                                 val_split: float = 0.2) -> None:
        """Train a multi-label classification model for symptom extraction
        
        Args:
            texts: List of text samples
            labels: Multi-label classification labels
            val_split: Validation split ratio
        """
        from transformers import AutoModelForSequenceClassification, TrainingArguments, Trainer
        from transformers import AutoTokenizer
        import torch
        import datasets
        
        print("Training classification model for symptom extraction...")
        
        # Initialize tokenizer if not already done
        if self.tokenizer is None:
            self.tokenizer = AutoTokenizer.from_pretrained(self.model_name)
        
        # Tokenize texts
        tokenized = self.tokenizer(texts, padding=True, truncation=True, 
                                 max_length=self.max_length, return_tensors="pt")
        
        # Convert to datasets format
        dataset = datasets.Dataset.from_dict({
            "input_ids": tokenized["input_ids"],
            "attention_mask": tokenized["attention_mask"],
            "labels": labels
        })
        
        # Split into training and validation sets
        dataset = dataset.train_test_split(test_size=val_split)
        
        # Initialize model
        model = AutoModelForSequenceClassification.from_pretrained(
            self.model_name, 
            num_labels=labels.shape[1],
            problem_type="multi_label_classification"
        )
        model.to(device)
        
        # Define training arguments
        training_args = TrainingArguments(
            output_dir=os.path.join(self.output_dir, "classification_checkpoints"),
            evaluation_strategy="epoch",
            learning_rate=self.learning_rate,
            per_device_train_batch_size=self.batch_size,
            per_device_eval_batch_size=self.batch_size,
            num_train_epochs=self.epochs,
            weight_decay=0.01,
            save_strategy="epoch",
            load_best_model_at_end=True,
        )
        
        # Define metrics computation function
        def compute_metrics(eval_preds):
            logits, labels = eval_preds
            predictions = (torch.sigmoid(torch.tensor(logits)) > 0.5).numpy().astype(int)
            
            # Compute metrics
            precision, recall, f1, _ = precision_recall_fscore_support(
                labels, predictions, average='weighted'
            )
            
            return {
                "precision": precision,
                "recall": recall,
                "f1": f1
            }
        
        # Initialize trainer
        trainer = Trainer(
            model=model,
            args=training_args,
            train_dataset=dataset["train"],
            eval_dataset=dataset["test"],
            tokenizer=self.tokenizer,
            compute_metrics=compute_metrics
        )
        
        # Train the model
        trainer.train()
        
        # Evaluate the model
        eval_results = trainer.evaluate()
        print(f"Evaluation results: {eval_results}")
        
        # Save the model
        model_path = os.path.join(self.output_dir, "symptom_classification_model")
        trainer.save_model(model_path)
        self.tokenizer.save_pretrained(model_path)
        
        print(f"Classification model saved to {model_path}")
    
    def train_negation_detection(self, texts: List[str], annotations: List[List[Dict[str, Any]]]) -> None:
        """Train a negation detection model for symptom extraction
        
        Args:
            texts: List of text samples
            annotations: List of annotation lists for each text
        """
        print("Training negation detection model...")
        
        # For simplicity, we'll use a rule-based approach for negation detection
        # In a real implementation, this would be a more sophisticated model
        
        # Common negation phrases
        negation_phrases = [
            "no", "not", "don't", "doesn't", "didn't", "haven't", "hasn't", "hadn't",
            "won't", "wouldn't", "can't", "cannot", "couldn't", "never", "none", "neither",
            "nor", "without", "deny", "denies", "denied", "absence of", "free of", "negative for"
        ]
        
        # Save the negation phrases
        with open(os.path.join(self.output_dir, "negation_phrases.json"), "w") as f:
            json.dump(negation_phrases, f)
        
        print(f"Negation detection model saved to {self.output_dir}")
    
    def train_all_models(self, data_path: str) -> None:
        """Train all symptom extraction models
        
        Args:
            data_path: Path to the symptom text data file
        """
        # Load data
        texts, annotations, symptom_to_id = self.load_data(data_path)
        
        # Save symptom mapping
        self.symptom_labels = {"symptom_to_id": symptom_to_id, "id_to_symptom": {v: k for k, v in symptom_to_id.items()}}
        with open(os.path.join(self.output_dir, "symptom_labels.json"), "w") as f:
            json.dump(self.symptom_labels, f)
        
        # Prepare data for NER
        ner_examples = self.prepare_ner_data(texts, annotations, symptom_to_id)
        
        # Prepare data for classification
        texts_cls, labels_cls = self.prepare_classification_data(texts, annotations, symptom_to_id)
        
        # Train NER model
        self.train_ner_model(ner_examples)
        
        # Train classification model
        self.train_classification_model(texts_cls, labels_cls)
        
        # Train negation detection
        self.train_negation_detection(texts, annotations)
        
        print("All symptom extraction models trained successfully!")


# Example usage
if __name__ == "__main__":
    import argparse
    
    parser = argparse.ArgumentParser(description="Train symptom extraction models")
    parser.add_argument("--data-path", type=str, required=True, help="Path to the symptom text data file")
    parser.add_argument("--model-name", type=str, default=NLP_CONFIG["transformer_model"], 
                        help="Name of the transformer model to use")
    parser.add_argument("--output-dir", type=str, help="Directory to save trained models")
    parser.add_argument("--batch-size", type=int, default=MODEL_CONFIG["batch_size"], 
                        help="Batch size for training")
    parser.add_argument("--learning-rate", type=float, default=MODEL_CONFIG["learning_rate"], 
                        help="Learning rate for training")
    parser.add_argument("--epochs", type=int, default=MODEL_CONFIG["epochs"], 
                        help="Number of epochs to train for")
    
    args = parser.parse_args()
    
    trainer = SymptomExtractionTrainer(
        model_name=args.model_name,
        batch_size=args.batch_size,
        learning_rate=args.learning_rate,
        epochs=args.epochs,
        output_dir=args.output_dir
    )
    
    trainer.train_all_models(args.data_path)