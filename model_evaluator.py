"""Model Evaluator for AI/ML Pipeline

This module provides functionality to evaluate the performance of
symptom extraction and disease prediction models.
"""

import os
import json
import pickle
import numpy as np
import pandas as pd
import matplotlib.pyplot as plt
import seaborn as sns
from pathlib import Path
from typing import Dict, List, Tuple, Any, Optional, Union
from sklearn.metrics import (
    accuracy_score, precision_score, recall_score, f1_score,
    roc_auc_score, confusion_matrix, classification_report,
    precision_recall_curve, average_precision_score
)

# Add the project root to the Python path
import sys
project_root = Path(__file__).parent.parent.absolute()
sys.path.insert(0, str(project_root))

from config import PATHS, EVALUATION_CONFIG


class ModelEvaluator:
    """Class for evaluating AI/ML models"""
    
    def __init__(self, output_dir: Optional[str] = None):
        """Initialize the model evaluator
        
        Args:
            output_dir: Directory to save evaluation results
        """
        self.output_dir = output_dir or os.path.join(project_root, PATHS["evaluation"])
        
        # Create output directory if it doesn't exist
        os.makedirs(self.output_dir, exist_ok=True)
        
        print(f"Initializing ModelEvaluator with output directory: {self.output_dir}")
    
    def evaluate_symptom_extraction(self, model_dir: str, test_data_path: str) -> Dict[str, Any]:
        """Evaluate symptom extraction model
        
        Args:
            model_dir: Directory containing the trained symptom extraction models
            test_data_path: Path to the test data file
            
        Returns:
            Dictionary containing evaluation metrics
        """
        print(f"Evaluating symptom extraction model from {model_dir}")
        
        # Load test data
        with open(test_data_path, 'r') as f:
            test_data = json.load(f)
        
        # Load NER model
        from transformers import AutoTokenizer, AutoModelForTokenClassification
        import torch
        
        ner_model_path = os.path.join(model_dir, "symptom_ner_model")
        tokenizer = AutoTokenizer.from_pretrained(ner_model_path)
        ner_model = AutoModelForTokenClassification.from_pretrained(ner_model_path)
        
        # Load label mappings
        with open(os.path.join(model_dir, "ner_labels.json"), 'r') as f:
            label_mappings = json.load(f)
            id_to_label = {int(k): v for k, v in label_mappings["id_to_label"].items()}
        
        # Evaluate NER model
        ner_results = self._evaluate_ner_model(ner_model, tokenizer, id_to_label, test_data)
        
        # Load classification model
        classification_model_path = os.path.join(model_dir, "symptom_classification_model")
        classification_model = AutoModelForTokenClassification.from_pretrained(classification_model_path)
        
        # Load symptom mappings
        with open(os.path.join(model_dir, "symptom_labels.json"), 'r') as f:
            symptom_mappings = json.load(f)
        
        # Evaluate classification model
        classification_results = self._evaluate_classification_model(
            classification_model, tokenizer, symptom_mappings, test_data
        )
        
        # Combine results
        results = {
            "ner": ner_results,
            "classification": classification_results
        }
        
        # Save results
        results_path = os.path.join(self.output_dir, "symptom_extraction_evaluation.json")
        with open(results_path, 'w') as f:
            json.dump(results, f, indent=2)
        
        print(f"Symptom extraction evaluation results saved to {results_path}")
        
        return results
    
    def _evaluate_ner_model(self, model, tokenizer, id_to_label, test_data):
        """Evaluate NER model for symptom extraction"""
        import torch
        
        # Set model to evaluation mode
        model.eval()
        
        true_entities = []
        pred_entities = []
        
        for item in test_data:
            text = item["text"]
            annotations = item["annotations"]
            
            # Get true entities
            true_entities_item = []
            for ann in annotations:
                true_entities_item.append({
                    "text": ann["text"],
                    "start": ann["start"],
                    "end": ann["end"],
                    "symptom_id": ann["symptom_id"]
                })
            
            true_entities.append(true_entities_item)
            
            # Get predicted entities
            inputs = tokenizer(text, return_tensors="pt", return_offsets_mapping=True)
            offset_mapping = inputs.pop("offset_mapping")
            
            with torch.no_grad():
                outputs = model(**inputs)
                predictions = torch.argmax(outputs.logits, dim=2)
            
            # Convert token predictions to character predictions
            pred_entities_item = []
            current_entity = None
            
            for token_idx, (pred_idx, (start_char, end_char)) in enumerate(zip(predictions[0], offset_mapping[0])):
                if start_char == 0 and end_char == 0:  # Special tokens
                    continue
                
                pred_label = id_to_label[pred_idx.item()]
                
                if pred_label.startswith("B-"):  # Beginning of entity
                    if current_entity is not None:
                        pred_entities_item.append(current_entity)
                    
                    current_entity = {
                        "text": text[start_char:end_char],
                        "start": start_char,
                        "end": end_char,
                        "label": pred_label[2:]  # Remove "B-" prefix
                    }
                
                elif pred_label.startswith("I-") and current_entity is not None:  # Inside entity
                    # Extend the current entity
                    current_entity["text"] += text[start_char:end_char]
                    current_entity["end"] = end_char
                
                else:  # Outside entity
                    if current_entity is not None:
                        pred_entities_item.append(current_entity)
                        current_entity = None
            
            # Add the last entity if there is one
            if current_entity is not None:
                pred_entities_item.append(current_entity)
            
            pred_entities.append(pred_entities_item)
        
        # Calculate metrics
        exact_match = 0
        partial_match = 0
        total_true = sum(len(entities) for entities in true_entities)
        total_pred = sum(len(entities) for entities in pred_entities)
        
        for true_item, pred_item in zip(true_entities, pred_entities):
            for true_entity in true_item:
                # Check for exact matches
                for pred_entity in pred_item:
                    if (true_entity["start"] == pred_entity["start"] and 
                        true_entity["end"] == pred_entity["end"]):
                        exact_match += 1
                        break
                
                # Check for partial matches (overlap)
                for pred_entity in pred_item:
                    if (max(true_entity["start"], pred_entity["start"]) < 
                        min(true_entity["end"], pred_entity["end"])):
                        partial_match += 1
                        break
        
        # Calculate precision, recall, and F1 score
        precision = exact_match / total_pred if total_pred > 0 else 0
        recall = exact_match / total_true if total_true > 0 else 0
        f1 = 2 * precision * recall / (precision + recall) if (precision + recall) > 0 else 0
        
        # Calculate partial match metrics
        partial_precision = partial_match / total_pred if total_pred > 0 else 0
        partial_recall = partial_match / total_true if total_true > 0 else 0
        partial_f1 = 2 * partial_precision * partial_recall / (partial_precision + partial_recall) if (partial_precision + partial_recall) > 0 else 0
        
        return {
            "exact_match": {
                "precision": precision,
                "recall": recall,
                "f1": f1
            },
            "partial_match": {
                "precision": partial_precision,
                "recall": partial_recall,
                "f1": partial_f1
            },
            "counts": {
                "true_entities": total_true,
                "predicted_entities": total_pred,
                "exact_matches": exact_match,
                "partial_matches": partial_match
            }
        }
    
    def _evaluate_classification_model(self, model, tokenizer, symptom_mappings, test_data):
        """Evaluate classification model for symptom extraction"""
        import torch
        
        # Set model to evaluation mode
        model.eval()
        
        # Prepare data
        texts = [item["text"] for item in test_data]
        
        # Create true labels
        symptom_to_id = symptom_mappings["symptom_to_id"]
        num_symptoms = len(symptom_to_id)
        true_labels = np.zeros((len(texts), num_symptoms))
        
        for i, item in enumerate(test_data):
            for ann in item["annotations"]:
                symptom_id = ann["symptom_id"]
                if symptom_id in symptom_to_id:
                    true_labels[i, symptom_to_id[symptom_id]] = 1
        
        # Get predictions
        inputs = tokenizer(texts, padding=True, truncation=True, return_tensors="pt")
        
        with torch.no_grad():
            outputs = model(**inputs)
            logits = outputs.logits
            predictions = torch.sigmoid(logits).numpy() > 0.5
        
        # Calculate metrics
        accuracy = accuracy_score(true_labels.flatten(), predictions.flatten())
        precision = precision_score(true_labels, predictions, average="weighted", zero_division=0)
        recall = recall_score(true_labels, predictions, average="weighted", zero_division=0)
        f1 = f1_score(true_labels, predictions, average="weighted", zero_division=0)
        
        # Calculate per-class metrics
        per_class_metrics = {}
        for symptom_id, idx in symptom_to_id.items():
            per_class_metrics[symptom_id] = {
                "precision": precision_score(true_labels[:, idx], predictions[:, idx], zero_division=0),
                "recall": recall_score(true_labels[:, idx], predictions[:, idx], zero_division=0),
                "f1": f1_score(true_labels[:, idx], predictions[:, idx], zero_division=0)
            }
        
        return {
            "overall": {
                "accuracy": accuracy,
                "precision": precision,
                "recall": recall,
                "f1": f1
            },
            "per_class": per_class_metrics
        }
    
    def evaluate_disease_prediction(self, model_dir: str, test_data_path: str) -> Dict[str, Any]:
        """Evaluate disease prediction model
        
        Args:
            model_dir: Directory containing the trained disease prediction models
            test_data_path: Path to the test data file
            
        Returns:
            Dictionary containing evaluation metrics
        """
        print(f"Evaluating disease prediction model from {model_dir}")
        
        # Load test data
        with open(test_data_path, 'r') as f:
            test_data = json.load(f)
        
        # Load models
        models = {}
        for model_type in ["random_forest", "gradient_boosting", "neural_network"]:
            model_path = os.path.join(model_dir, f"{model_type}_model.pkl")
            if os.path.exists(model_path):
                with open(model_path, 'rb') as f:
                    models[model_type] = pickle.load(f)
        
        # Load feature scaler
        scaler_path = os.path.join(model_dir, "feature_scaler.pkl")
        with open(scaler_path, 'rb') as f:
            scaler = pickle.load(f)
        
        # Load feature and disease mappings
        with open(os.path.join(model_dir, "feature_mapping.json"), 'r') as f:
            feature_mapping = json.load(f)
        
        with open(os.path.join(model_dir, "disease_mapping.json"), 'r') as f:
            disease_mapping = json.load(f)
        
        # Prepare test data
        X_test, y_test = self._prepare_disease_prediction_data(test_data, feature_mapping, disease_mapping)
        
        # Scale features
        X_test_scaled = scaler.transform(X_test)
        
        # Evaluate each model
        results = {}
        for model_type, model in models.items():
            model_results = self._evaluate_disease_prediction_model(
                model, X_test_scaled, y_test, disease_mapping
            )
            results[model_type] = model_results
        
        # Save results
        results_path = os.path.join(self.output_dir, "disease_prediction_evaluation.json")
        with open(results_path, 'w') as f:
            json.dump(results, f, indent=2)
        
        print(f"Disease prediction evaluation results saved to {results_path}")
        
        # Generate visualizations
        self._generate_disease_prediction_visualizations(results, disease_mapping)
        
        return results
    
    def _prepare_disease_prediction_data(self, test_data, feature_mapping, disease_mapping):
        """Prepare data for disease prediction evaluation"""
        # Extract features and labels
        features = []
        labels = []
        
        for case in test_data:
            # Extract features (symptoms)
            case_features = np.zeros(len(feature_mapping))
            for symptom in case["symptoms"]:
                symptom_id = symptom["symptom_id"]
                if symptom_id in feature_mapping:
                    feature_idx = feature_mapping[symptom_id]
                    case_features[feature_idx] = 1
            
            features.append(case_features)
            
            # Extract label (disease)
            disease_id = case["disease_id"]
            if disease_id in disease_mapping:
                disease_idx = disease_mapping[disease_id]
                labels.append(disease_idx)
            else:
                labels.append(-1)  # Unknown disease
        
        return np.array(features), np.array(labels)
    
    def _evaluate_disease_prediction_model(self, model, X_test, y_test, disease_mapping):
        """Evaluate a disease prediction model"""
        # Get predictions
        y_pred = model.predict(X_test)
        y_pred_proba = model.predict_proba(X_test)
        
        # Calculate metrics
        accuracy = accuracy_score(y_test, y_pred)
        precision = precision_score(y_test, y_pred, average="weighted")
        recall = recall_score(y_test, y_pred, average="weighted")
        f1 = f1_score(y_test, y_pred, average="weighted")
        
        # Calculate per-class metrics
        per_class_metrics = {}
        for disease_id, disease_idx in disease_mapping.items():
            per_class_metrics[disease_id] = {
                "precision": precision_score(y_test == disease_idx, y_pred == disease_idx, zero_division=0),
                "recall": recall_score(y_test == disease_idx, y_pred == disease_idx, zero_division=0),
                "f1": f1_score(y_test == disease_idx, y_pred == disease_idx, zero_division=0)
            }
        
        # Calculate confusion matrix
        cm = confusion_matrix(y_test, y_pred)
        
        # Calculate ROC AUC (one-vs-rest)
        roc_auc = {}
        for disease_id, disease_idx in disease_mapping.items():
            if len(np.unique(y_test == disease_idx)) > 1:  # Check if both classes are present
                roc_auc[disease_id] = roc_auc_score(y_test == disease_idx, y_pred_proba[:, disease_idx])
        
        return {
            "overall": {
                "accuracy": accuracy,
                "precision": precision,
                "recall": recall,
                "f1": f1
            },
            "per_class": per_class_metrics,
            "roc_auc": roc_auc,
            "confusion_matrix": cm.tolist()
        }
    
    def _generate_disease_prediction_visualizations(self, results, disease_mapping):
        """Generate visualizations for disease prediction evaluation"""
        # Create a mapping from disease index to disease ID
        idx_to_disease = {idx: disease_id for disease_id, idx in disease_mapping.items()}
        
        # Generate confusion matrix heatmap for each model
        for model_type, model_results in results.items():
            cm = np.array(model_results["confusion_matrix"])
            
            plt.figure(figsize=(10, 8))
            sns.heatmap(cm, annot=True, fmt="d", cmap="Blues")
            plt.xlabel("Predicted")
            plt.ylabel("True")
            plt.title(f"Confusion Matrix - {model_type.replace('_', ' ').title()}")
            
            # Save the figure
            plt.savefig(os.path.join(self.output_dir, f"{model_type}_confusion_matrix.png"))
            plt.close()
        
        # Generate bar chart of F1 scores for each disease across models
        disease_ids = list(disease_mapping.keys())
        model_types = list(results.keys())
        
        f1_scores = np.zeros((len(disease_ids), len(model_types)))
        
        for i, disease_id in enumerate(disease_ids):
            for j, model_type in enumerate(model_types):
                f1_scores[i, j] = results[model_type]["per_class"][disease_id]["f1"]
        
        plt.figure(figsize=(12, 8))
        x = np.arange(len(disease_ids))
        width = 0.8 / len(model_types)
        
        for j, model_type in enumerate(model_types):
            plt.bar(x + j * width - 0.4 + width / 2, f1_scores[:, j], width, label=model_type.replace('_', ' ').title())
        
        plt.xlabel("Disease")
        plt.ylabel("F1 Score")
        plt.title("F1 Scores by Disease and Model")
        plt.xticks(x, disease_ids, rotation=90)
        plt.legend()
        plt.tight_layout()
        
        # Save the figure
        plt.savefig(os.path.join(self.output_dir, "f1_scores_by_disease.png"))
        plt.close()
    
    def evaluate_end_to_end(self, symptom_extraction_model_dir: str, 
                           disease_prediction_model_dir: str,
                           test_data_path: str) -> Dict[str, Any]:
        """Evaluate the end-to-end pipeline
        
        Args:
            symptom_extraction_model_dir: Directory containing symptom extraction models
            disease_prediction_model_dir: Directory containing disease prediction models
            test_data_path: Path to the test data file
            
        Returns:
            Dictionary containing evaluation metrics
        """
        print("Evaluating end-to-end pipeline...")
        
        # Load test data
        with open(test_data_path, 'r') as f:
            test_data = json.load(f)
        
        # Load symptom extraction models
        from transformers import AutoTokenizer, AutoModelForTokenClassification
        import torch
        
        ner_model_path = os.path.join(symptom_extraction_model_dir, "symptom_ner_model")
        tokenizer = AutoTokenizer.from_pretrained(ner_model_path)
        ner_model = AutoModelForTokenClassification.from_pretrained(ner_model_path)
        
        # Load label mappings
        with open(os.path.join(symptom_extraction_model_dir, "ner_labels.json"), 'r') as f:
            label_mappings = json.load(f)
            id_to_label = {int(k): v for k, v in label_mappings["id_to_label"].items()}
        
        # Load symptom mappings
        with open(os.path.join(symptom_extraction_model_dir, "symptom_labels.json"), 'r') as f:
            symptom_mappings = json.load(f)
            id_to_symptom = symptom_mappings["id_to_symptom"]
        
        # Load disease prediction models
        models = {}
        for model_type in ["random_forest", "gradient_boosting", "neural_network"]:
            model_path = os.path.join(disease_prediction_model_dir, f"{model_type}_model.pkl")
            if os.path.exists(model_path):
                with open(model_path, 'rb') as f:
                    models[model_type] = pickle.load(f)
        
        # Load feature scaler
        scaler_path = os.path.join(disease_prediction_model_dir, "feature_scaler.pkl")
        with open(scaler_path, 'rb') as f:
            scaler = pickle.load(f)
        
        # Load feature and disease mappings
        with open(os.path.join(disease_prediction_model_dir, "feature_mapping.json"), 'r') as f:
            feature_mapping = json.load(f)
        
        with open(os.path.join(disease_prediction_model_dir, "disease_mapping.json"), 'r') as f:
            disease_mapping = json.load(f)
            disease_idx_to_id = {idx: disease_id for disease_id, idx in disease_mapping.items()}
        
        # Evaluate end-to-end pipeline
        results = []
        
        for item in test_data:
            text = item["text"]
            true_disease_id = item["disease_id"]
            
            # Extract symptoms using NER model
            extracted_symptoms = self._extract_symptoms(text, ner_model, tokenizer, id_to_label)
            
            # Map extracted symptoms to feature vector
            feature_vector = np.zeros(len(feature_mapping))
            for symptom in extracted_symptoms:
                symptom_text = symptom["text"].lower()
                # Find matching symptom ID (simplified matching for demonstration)
                for symptom_id in feature_mapping.keys():
                    if symptom_id in id_to_symptom and symptom_text in id_to_symptom[symptom_id].lower():
                        feature_idx = feature_mapping[symptom_id]
                        feature_vector[feature_idx] = 1
                        break
            
            # Scale features
            feature_vector_scaled = scaler.transform(feature_vector.reshape(1, -1))
            
            # Predict disease using each model
            predictions = {}
            for model_type, model in models.items():
                pred_idx = model.predict(feature_vector_scaled)[0]
                pred_disease_id = disease_idx_to_id.get(pred_idx, "unknown")
                predictions[model_type] = {
                    "predicted_disease_id": pred_disease_id,
                    "correct": pred_disease_id == true_disease_id
                }
            
            results.append({
                "text": text,
                "true_disease_id": true_disease_id,
                "extracted_symptoms": extracted_symptoms,
                "predictions": predictions
            })
        
        # Calculate overall accuracy for each model
        accuracy = {}
        for model_type in models.keys():
            correct = sum(1 for r in results if r["predictions"][model_type]["correct"])
            accuracy[model_type] = correct / len(results) if results else 0
        
        # Save results
        end_to_end_results = {
            "accuracy": accuracy,
            "detailed_results": results
        }
        
        results_path = os.path.join(self.output_dir, "end_to_end_evaluation.json")
        with open(results_path, 'w') as f:
            json.dump(end_to_end_results, f, indent=2)
        
        print(f"End-to-end evaluation results saved to {results_path}")
        
        return end_to_end_results
    
    def _extract_symptoms(self, text, ner_model, tokenizer, id_to_label):
        """Extract symptoms from text using NER model"""
        import torch
        
        # Set model to evaluation mode
        ner_model.eval()
        
        # Tokenize text
        inputs = tokenizer(text, return_tensors="pt", return_offsets_mapping=True)
        offset_mapping = inputs.pop("offset_mapping")
        
        # Get predictions
        with torch.no_grad():
            outputs = ner_model(**inputs)
            predictions = torch.argmax(outputs.logits, dim=2)
        
        # Convert token predictions to entities
        entities = []
        current_entity = None
        
        for token_idx, (pred_idx, (start_char, end_char)) in enumerate(zip(predictions[0], offset_mapping[0])):
            if start_char == 0 and end_char == 0:  # Special tokens
                continue
            
            pred_label = id_to_label[pred_idx.item()]
            
            if pred_label.startswith("B-"):  # Beginning of entity
                if current_entity is not None:
                    entities.append(current_entity)
                
                current_entity = {
                    "text": text[start_char:end_char],
                    "start": start_char,
                    "end": end_char,
                    "label": pred_label[2:]  # Remove "B-" prefix
                }
            
            elif pred_label.startswith("I-") and current_entity is not None:  # Inside entity
                # Extend the current entity
                current_entity["text"] += text[start_char:end_char]
                current_entity["end"] = end_char
            
            else:  # Outside entity
                if current_entity is not None:
                    entities.append(current_entity)
                    current_entity = None
        
        # Add the last entity if there is one
        if current_entity is not None:
            entities.append(current_entity)
        
        return entities


# Example usage
if __name__ == "__main__":
    import argparse
    
    parser = argparse.ArgumentParser(description="Evaluate AI/ML models")
    parser.add_argument("--symptom-extraction-model-dir", type=str, 
                        help="Directory containing symptom extraction models")
    parser.add_argument("--disease-prediction-model-dir", type=str, 
                        help="Directory containing disease prediction models")
    parser.add_argument("--symptom-test-data", type=str, 
                        help="Path to the symptom extraction test data file")
    parser.add_argument("--disease-test-data", type=str, 
                        help="Path to the disease prediction test data file")
    parser.add_argument("--end-to-end-test-data", type=str, 
                        help="Path to the end-to-end test data file")
    parser.add_argument("--output-dir", type=str, 
                        help="Directory to save evaluation results")
    
    args = parser.parse_args()
    
    evaluator = ModelEvaluator(output_dir=args.output_dir)
    
    if args.symptom_extraction_model_dir and args.symptom_test_data:
        evaluator.evaluate_symptom_extraction(
            args.symptom_extraction_model_dir, args.symptom_test_data
        )
    
    if args.disease_prediction_model_dir and args.disease_test_data:
        evaluator.evaluate_disease_prediction(
            args.disease_prediction_model_dir, args.disease_test_data
        )
    
    if (args.symptom_extraction_model_dir and args.disease_prediction_model_dir and 
        args.end_to_end_test_data):
        evaluator.evaluate_end_to_end(
            args.symptom_extraction_model_dir, args.disease_prediction_model_dir,
            args.end_to_end_test_data
        )