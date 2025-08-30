"""Model Trainer for Disease Prediction

This module provides functionality to train and evaluate the disease prediction model
using the data prepared by the data_loader module.
"""

import os
import json
import pickle
import numpy as np
import pandas as pd
from pathlib import Path
from typing import Dict, List, Tuple, Any, Optional, Union
from datetime import datetime

# ML libraries
from sklearn.ensemble import RandomForestClassifier, GradientBoostingClassifier
from sklearn.neural_network import MLPClassifier
from sklearn.preprocessing import StandardScaler
from sklearn.metrics import accuracy_score, precision_score, recall_score, f1_score, roc_auc_score
from sklearn.metrics import confusion_matrix, classification_report
from sklearn.calibration import CalibratedClassifierCV

# Add the project root to the Python path
import sys
project_root = Path(__file__).parent.parent.absolute()
sys.path.insert(0, str(project_root))

from config import TRAINING_CONFIG, MODEL_CONFIG
from training.data_loader import MedicalDataLoader


class DiseasePredictionTrainer:
    """Class for training and evaluating disease prediction models"""
    
    def __init__(self, data_dir: Optional[str] = None, model_dir: Optional[str] = None):
        """Initialize the trainer
        
        Args:
            data_dir: Directory containing the data files
            model_dir: Directory to save trained models
        """
        self.data_dir = data_dir or os.path.join(project_root, 'data')
        self.model_dir = model_dir or os.path.join(project_root, 'models')
        self.data_loader = MedicalDataLoader(data_dir=self.data_dir)
        self.models = {}
        self.scalers = {}
        self.metadata = {}
        
        # Create model directory if it doesn't exist
        os.makedirs(self.model_dir, exist_ok=True)
    
    def load_data(self) -> Tuple[np.ndarray, np.ndarray, np.ndarray, np.ndarray, np.ndarray, np.ndarray]:
        """Load and prepare data for training
        
        Returns:
            Tuple of (X_train, X_val, X_test, y_train, y_val, y_test)
        """
        # Check if processed data exists
        processed_dir = os.path.join(self.data_dir, 'processed')
        
        if os.path.exists(processed_dir) and all(os.path.exists(os.path.join(processed_dir, f)) 
                                               for f in ['X_train.npy', 'y_train.npy', 
                                                        'X_val.npy', 'y_val.npy',
                                                        'X_test.npy', 'y_test.npy']):
            # Load pre-processed data
            X_train = np.load(os.path.join(processed_dir, 'X_train.npy'))
            y_train = np.load(os.path.join(processed_dir, 'y_train.npy'))
            X_val = np.load(os.path.join(processed_dir, 'X_val.npy'))
            y_val = np.load(os.path.join(processed_dir, 'y_val.npy'))
            X_test = np.load(os.path.join(processed_dir, 'X_test.npy'))
            y_test = np.load(os.path.join(processed_dir, 'y_test.npy'))
            
            # Load metadata
            if os.path.exists(os.path.join(processed_dir, 'symptom_metadata.csv')):
                self.metadata['symptoms'] = pd.read_csv(os.path.join(processed_dir, 'symptom_metadata.csv'))
                
            if os.path.exists(os.path.join(processed_dir, 'disease_metadata.csv')):
                self.metadata['diseases'] = pd.read_csv(os.path.join(processed_dir, 'disease_metadata.csv'))
        else:
            # Prepare data from scratch
            X, y = self.data_loader.prepare_disease_prediction_data()
            
            if len(X) == 0 or len(y) == 0:
                raise ValueError("No data available for training")
                
            # Split data
            X_train, X_val, X_test, y_train, y_val, y_test = self.data_loader.split_data(X, y)
            
            # Save processed data for future use
            self.data_loader.save_processed_data(X_train, y_train, X_val, y_val, X_test, y_test)
            
            # Store metadata
            self.metadata['symptoms'] = self.data_loader.symptom_data
            self.metadata['diseases'] = self.data_loader.disease_data
        
        return X_train, X_val, X_test, y_train, y_val, y_test
    
    def preprocess_data(self, X_train: np.ndarray, X_val: np.ndarray, X_test: np.ndarray) -> Tuple[np.ndarray, np.ndarray, np.ndarray]:
        """Preprocess data for training
        
        Args:
            X_train: Training features
            X_val: Validation features
            X_test: Test features
            
        Returns:
            Tuple of preprocessed (X_train, X_val, X_test)
        """
        # Scale features if needed
        if TRAINING_CONFIG["scale_features"]:
            scaler = StandardScaler()
            X_train_scaled = scaler.fit_transform(X_train)
            X_val_scaled = scaler.transform(X_val)
            X_test_scaled = scaler.transform(X_test)
            
            # Save the scaler
            self.scalers['standard_scaler'] = scaler
            
            return X_train_scaled, X_val_scaled, X_test_scaled
        
        return X_train, X_val, X_test
    
    def train_models(self, X_train: np.ndarray, y_train: np.ndarray, X_val: np.ndarray, y_val: np.ndarray) -> Dict[str, Any]:
        """Train multiple models and select the best one
        
        Args:
            X_train: Training features
            y_train: Training labels
            X_val: Validation features
            y_val: Validation labels
            
        Returns:
            Dictionary of trained models
        """
        models = {}
        model_performances = {}
        
        # Random Forest
        if 'random_forest' in MODEL_CONFIG["models_to_train"]:
            print("Training Random Forest...")
            rf_params = MODEL_CONFIG["random_forest_params"]
            rf = RandomForestClassifier(
                n_estimators=rf_params["n_estimators"],
                max_depth=rf_params["max_depth"],
                min_samples_split=rf_params["min_samples_split"],
                random_state=TRAINING_CONFIG["random_seed"]
            )
            rf.fit(X_train, y_train)
            
            # Calibrate probabilities
            if MODEL_CONFIG["calibrate_probabilities"]:
                rf = CalibratedClassifierCV(rf, cv='prefit')
                rf.fit(X_val, y_val)
            
            # Evaluate
            y_pred = rf.predict(X_val)
            accuracy = accuracy_score(y_val, y_pred)
            
            models['random_forest'] = rf
            model_performances['random_forest'] = accuracy
            print(f"Random Forest Validation Accuracy: {accuracy:.4f}")
        
        # Gradient Boosting
        if 'gradient_boosting' in MODEL_CONFIG["models_to_train"]:
            print("Training Gradient Boosting...")
            gb_params = MODEL_CONFIG["gradient_boosting_params"]
            gb = GradientBoostingClassifier(
                n_estimators=gb_params["n_estimators"],
                learning_rate=gb_params["learning_rate"],
                max_depth=gb_params["max_depth"],
                random_state=TRAINING_CONFIG["random_seed"]
            )
            gb.fit(X_train, y_train)
            
            # Calibrate probabilities
            if MODEL_CONFIG["calibrate_probabilities"]:
                gb = CalibratedClassifierCV(gb, cv='prefit')
                gb.fit(X_val, y_val)
            
            # Evaluate
            y_pred = gb.predict(X_val)
            accuracy = accuracy_score(y_val, y_pred)
            
            models['gradient_boosting'] = gb
            model_performances['gradient_boosting'] = accuracy
            print(f"Gradient Boosting Validation Accuracy: {accuracy:.4f}")
        
        # Neural Network
        if 'neural_network' in MODEL_CONFIG["models_to_train"]:
            print("Training Neural Network...")
            nn_params = MODEL_CONFIG["neural_network_params"]
            nn = MLPClassifier(
                hidden_layer_sizes=nn_params["hidden_layer_sizes"],
                activation=nn_params["activation"],
                solver=nn_params["solver"],
                alpha=nn_params["alpha"],
                max_iter=nn_params["max_iter"],
                random_state=TRAINING_CONFIG["random_seed"]
            )
            nn.fit(X_train, y_train)
            
            # Calibrate probabilities
            if MODEL_CONFIG["calibrate_probabilities"]:
                nn = CalibratedClassifierCV(nn, cv='prefit')
                nn.fit(X_val, y_val)
            
            # Evaluate
            y_pred = nn.predict(X_val)
            accuracy = accuracy_score(y_val, y_pred)
            
            models['neural_network'] = nn
            model_performances['neural_network'] = accuracy
            print(f"Neural Network Validation Accuracy: {accuracy:.4f}")
        
        # Store all models
        self.models = models
        
        # Determine best model
        if model_performances:
            best_model_name = max(model_performances, key=model_performances.get)
            self.models['best_model'] = best_model_name
            print(f"Best model: {best_model_name} with accuracy: {model_performances[best_model_name]:.4f}")
        
        return models
    
    def evaluate_model(self, model: Any, X_test: np.ndarray, y_test: np.ndarray) -> Dict[str, float]:
        """Evaluate a trained model on the test set
        
        Args:
            model: Trained model
            X_test: Test features
            y_test: Test labels
            
        Returns:
            Dictionary of evaluation metrics
        """
        # Make predictions
        y_pred = model.predict(X_test)
        y_prob = model.predict_proba(X_test) if hasattr(model, 'predict_proba') else None
        
        # Calculate metrics
        metrics = {
            'accuracy': accuracy_score(y_test, y_pred),
            'precision_micro': precision_score(y_test, y_pred, average='micro'),
            'recall_micro': recall_score(y_test, y_pred, average='micro'),
            'f1_micro': f1_score(y_test, y_pred, average='micro'),
            'precision_macro': precision_score(y_test, y_pred, average='macro'),
            'recall_macro': recall_score(y_test, y_pred, average='macro'),
            'f1_macro': f1_score(y_test, y_pred, average='macro')
        }
        
        # Calculate ROC AUC if probabilities are available
        if y_prob is not None:
            # For multi-class, use one-vs-rest approach
            if y_prob.shape[1] > 2:
                # One-hot encode the labels for multi-class ROC AUC
                from sklearn.preprocessing import label_binarize
                classes = np.unique(y_test)
                y_test_bin = label_binarize(y_test, classes=classes)
                
                # Calculate ROC AUC for each class and average
                roc_auc = roc_auc_score(y_test_bin, y_prob, average='macro', multi_class='ovr')
            else:
                # Binary classification
                roc_auc = roc_auc_score(y_test, y_prob[:, 1])
                
            metrics['roc_auc'] = roc_auc
        
        return metrics
    
    def save_models(self) -> None:
        """Save trained models and metadata"""
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        model_save_dir = os.path.join(self.model_dir, f"disease_prediction_{timestamp}")
        os.makedirs(model_save_dir, exist_ok=True)
        
        # Save each model
        for model_name, model in self.models.items():
            if model_name != 'best_model':  # Skip the best_model reference
                model_path = os.path.join(model_save_dir, f"{model_name}.pkl")
                with open(model_path, 'wb') as f:
                    pickle.dump(model, f)
        
        # Save scalers
        for scaler_name, scaler in self.scalers.items():
            scaler_path = os.path.join(model_save_dir, f"{scaler_name}.pkl")
            with open(scaler_path, 'wb') as f:
                pickle.dump(scaler, f)
        
        # Save metadata
        metadata = {
            'timestamp': timestamp,
            'best_model': self.models.get('best_model'),
            'model_config': MODEL_CONFIG,
            'training_config': TRAINING_CONFIG
        }
        
        # Add disease and symptom mappings if available
        if 'diseases' in self.metadata and len(self.metadata['diseases']) > 0:
            disease_mapping = {}
            for _, row in self.metadata['diseases'].iterrows():
                disease_mapping[row['disease_id']] = {
                    'name': row['name'],
                    'icd_code': row['icd_code'],
                    'snomed_code': row['snomed_code'],
                    'category': row['category']
                }
            metadata['disease_mapping'] = disease_mapping
        
        if 'symptoms' in self.metadata and len(self.metadata['symptoms']) > 0:
            symptom_mapping = {}
            for _, row in self.metadata['symptoms'].iterrows():
                symptom_mapping[row['symptom_id']] = {
                    'name': row['name'],
                    'body_part': row['body_part'],
                    'category': row['category']
                }
            metadata['symptom_mapping'] = symptom_mapping
        
        # Save metadata as JSON
        with open(os.path.join(model_save_dir, 'metadata.json'), 'w') as f:
            # Convert any non-serializable objects to strings
            def json_serializable(obj):
                try:
                    json.dumps(obj)
                    return obj
                except (TypeError, OverflowError):
                    return str(obj)
            
            serializable_metadata = {k: json_serializable(v) for k, v in metadata.items()}
            json.dump(serializable_metadata, f, indent=2)
        
        # Create a symlink to the latest model directory
        latest_link = os.path.join(self.model_dir, 'latest')
        if os.path.exists(latest_link):
            if os.path.islink(latest_link):
                os.unlink(latest_link)
            else:
                os.remove(latest_link)
        
        # Create relative symlink
        os.symlink(os.path.basename(model_save_dir), latest_link)
        
        print(f"Models saved to {model_save_dir}")
    
    def train_and_evaluate(self) -> Dict[str, Any]:
        """Train and evaluate models
        
        Returns:
            Dictionary with training results
        """
        print("Loading data...")
        X_train, X_val, X_test, y_train, y_val, y_test = self.load_data()
        
        print("Preprocessing data...")
        X_train, X_val, X_test = self.preprocess_data(X_train, X_val, X_test)
        
        print("Training models...")
        models = self.train_models(X_train, y_train, X_val, y_val)
        
        print("Evaluating models...")
        evaluation_results = {}
        
        for model_name, model in models.items():
            if model_name != 'best_model':  # Skip the best_model reference
                print(f"Evaluating {model_name}...")
                metrics = self.evaluate_model(model, X_test, y_test)
                evaluation_results[model_name] = metrics
                
                print(f"{model_name} Test Metrics:")
                for metric_name, value in metrics.items():
                    print(f"  {metric_name}: {value:.4f}")
        
        print("Saving models...")
        self.save_models()
        
        return {
            'models': models,
            'evaluation': evaluation_results,
            'best_model': self.models.get('best_model')
        }


# Example usage
if __name__ == "__main__":
    trainer = DiseasePredictionTrainer()
    
    try:
        results = trainer.train_and_evaluate()
        print("\nTraining completed successfully!")
        
        if 'best_model' in results and results['best_model']:
            best_model = results['best_model']
            best_metrics = results['evaluation'][best_model]
            
            print(f"\nBest model: {best_model}")
            print("Test Metrics:")
            for metric_name, value in best_metrics.items():
                print(f"  {metric_name}: {value:.4f}")
    except Exception as e:
        print(f"Error during training: {str(e)}")