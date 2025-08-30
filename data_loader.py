"""Data Loader for AI/ML Training

This module provides functionality to load and preprocess data for training
the symptom extraction and disease prediction models.
"""

import os
import json
import pandas as pd
import numpy as np
from pathlib import Path
from typing import Dict, List, Tuple, Any, Optional
from sklearn.model_selection import train_test_split

# Add the project root to the Python path
import sys
project_root = Path(__file__).parent.parent.absolute()
sys.path.insert(0, str(project_root))

from config import DATA_CONFIG


class MedicalDataLoader:
    """Class for loading and preprocessing medical data for AI/ML training"""
    
    def __init__(self, data_dir: Optional[str] = None):
        """Initialize the data loader
        
        Args:
            data_dir: Directory containing the data files. If None, uses the default from config.
        """
        self.data_dir = data_dir or os.path.join(project_root, DATA_CONFIG["data_directory"])
        self.symptom_data = None
        self.disease_data = None
        self.symptom_text_data = None
        
    def load_symptom_data(self) -> pd.DataFrame:
        """Load symptom data from CSV or JSON file
        
        Returns:
            DataFrame containing symptom data
        """
        symptom_file = os.path.join(self.data_dir, DATA_CONFIG["symptom_data_file"])
        
        if not os.path.exists(symptom_file):
            # Create empty dataframe with expected schema if file doesn't exist
            self.symptom_data = pd.DataFrame({
                'symptom_id': [],
                'name': [],
                'description': [],
                'category': [],
                'body_part': [],
                'severity_scale': [],
                'common_duration': [],
                'icd_code': [],
                'snomed_code': []
            })
            return self.symptom_data
        
        # Load data based on file extension
        if symptom_file.endswith('.csv'):
            self.symptom_data = pd.read_csv(symptom_file)
        elif symptom_file.endswith('.json'):
            with open(symptom_file, 'r') as f:
                self.symptom_data = pd.DataFrame(json.load(f))
        else:
            raise ValueError(f"Unsupported file format for {symptom_file}")
            
        return self.symptom_data
    
    def load_disease_data(self) -> pd.DataFrame:
        """Load disease data from CSV or JSON file
        
        Returns:
            DataFrame containing disease data
        """
        disease_file = os.path.join(self.data_dir, DATA_CONFIG["disease_data_file"])
        
        if not os.path.exists(disease_file):
            # Create empty dataframe with expected schema if file doesn't exist
            self.disease_data = pd.DataFrame({
                'disease_id': [],
                'name': [],
                'description': [],
                'category': [],
                'icd_code': [],
                'snomed_code': [],
                'common_symptoms': [],
                'required_symptoms': [],
                'exclusionary_symptoms': [],
                'prevalence': [],
                'severity': []
            })
            return self.disease_data
        
        # Load data based on file extension
        if disease_file.endswith('.csv'):
            self.disease_data = pd.read_csv(disease_file)
        elif disease_file.endswith('.json'):
            with open(disease_file, 'r') as f:
                data = json.load(f)
                self.disease_data = pd.DataFrame(data)
        else:
            raise ValueError(f"Unsupported file format for {disease_file}")
            
        return self.disease_data
    
    def load_symptom_text_data(self) -> pd.DataFrame:
        """Load symptom text data for NLP training
        
        Returns:
            DataFrame containing text data with symptom annotations
        """
        text_file = os.path.join(self.data_dir, DATA_CONFIG["symptom_text_data_file"])
        
        if not os.path.exists(text_file):
            # Create empty dataframe with expected schema if file doesn't exist
            self.symptom_text_data = pd.DataFrame({
                'text_id': [],
                'text': [],
                'annotations': [],
                'source': []
            })
            return self.symptom_text_data
        
        # Load data based on file extension
        if text_file.endswith('.csv'):
            self.symptom_text_data = pd.read_csv(text_file)
        elif text_file.endswith('.json'):
            with open(text_file, 'r') as f:
                data = json.load(f)
                self.symptom_text_data = pd.DataFrame(data)
        else:
            raise ValueError(f"Unsupported file format for {text_file}")
            
        return self.symptom_text_data
    
    def prepare_symptom_extraction_data(self) -> Tuple[List[str], List[List[Dict[str, Any]]]]:  
        """Prepare data for training symptom extraction model
        
        Returns:
            Tuple of (texts, annotations) for NER training
        """
        if self.symptom_text_data is None:
            self.load_symptom_text_data()
            
        if len(self.symptom_text_data) == 0:
            # Return empty lists if no data
            return [], []
        
        texts = self.symptom_text_data['text'].tolist()
        
        # Convert annotations to the format expected by the NER model
        annotations = []
        for ann in self.symptom_text_data['annotations']:
            if isinstance(ann, str):
                # If stored as JSON string, parse it
                ann = json.loads(ann)
            annotations.append(ann)
            
        return texts, annotations
    
    def prepare_disease_prediction_data(self) -> Tuple[np.ndarray, np.ndarray]:
        """Prepare data for training disease prediction model
        
        Returns:
            Tuple of (X, y) where X is symptom features and y is disease labels
        """
        if self.symptom_data is None:
            self.load_symptom_data()
            
        if self.disease_data is None:
            self.load_disease_data()
            
        # If no data is available, return empty arrays
        if len(self.symptom_data) == 0 or len(self.disease_data) == 0:
            return np.array([]), np.array([])
        
        # Load symptom-disease relationship data
        relationship_file = os.path.join(self.data_dir, DATA_CONFIG["symptom_disease_relationship_file"])
        
        if not os.path.exists(relationship_file):
            # Return empty arrays if relationship file doesn't exist
            return np.array([]), np.array([])
        
        # Load relationship data
        if relationship_file.endswith('.csv'):
            relationship_data = pd.read_csv(relationship_file)
        elif relationship_file.endswith('.json'):
            with open(relationship_file, 'r') as f:
                relationship_data = pd.DataFrame(json.load(f))
        else:
            raise ValueError(f"Unsupported file format for {relationship_file}")
        
        # Create feature matrix X and target vector y
        # This is a simplified version - in a real system, this would be more complex
        all_symptoms = self.symptom_data['symptom_id'].unique()
        all_diseases = self.disease_data['disease_id'].unique()
        
        # Create mapping dictionaries
        symptom_to_idx = {symptom: i for i, symptom in enumerate(all_symptoms)}
        disease_to_idx = {disease: i for i, disease in enumerate(all_diseases)}
        
        # Group by case_id to get symptom combinations
        case_groups = relationship_data.groupby('case_id')
        
        X = []
        y = []
        
        for _, group in case_groups:
            # Create symptom feature vector (one-hot encoding)
            symptom_vector = np.zeros(len(all_symptoms))
            for symptom_id in group['symptom_id'].unique():
                if symptom_id in symptom_to_idx:
                    symptom_vector[symptom_to_idx[symptom_id]] = 1
            
            # Get the diagnosed disease(s)
            for disease_id in group['disease_id'].unique():
                if disease_id in disease_to_idx:
                    disease_idx = disease_to_idx[disease_id]
                    
                    # Add this case to the dataset
                    X.append(symptom_vector)
                    y.append(disease_idx)
        
        return np.array(X), np.array(y)
    
    def split_data(self, X: np.ndarray, y: np.ndarray, 
                  test_size: float = 0.2, 
                  val_size: float = 0.1,
                  random_state: int = 42) -> Tuple[np.ndarray, np.ndarray, np.ndarray, np.ndarray, np.ndarray, np.ndarray]:
        """Split data into train, validation, and test sets
        
        Args:
            X: Feature matrix
            y: Target vector
            test_size: Proportion of data to use for testing
            val_size: Proportion of data to use for validation
            random_state: Random seed for reproducibility
            
        Returns:
            Tuple of (X_train, X_val, X_test, y_train, y_val, y_test)
        """
        # First split: separate test set
        X_train_val, X_test, y_train_val, y_test = train_test_split(
            X, y, test_size=test_size, random_state=random_state, stratify=y if len(np.unique(y)) > 1 else None
        )
        
        # Second split: separate validation set from training set
        # Adjust validation size to account for the test split
        adjusted_val_size = val_size / (1 - test_size)
        
        X_train, X_val, y_train, y_val = train_test_split(
            X_train_val, y_train_val, 
            test_size=adjusted_val_size, 
            random_state=random_state,
            stratify=y_train_val if len(np.unique(y_train_val)) > 1 else None
        )
        
        return X_train, X_val, X_test, y_train, y_val, y_test
    
    def save_processed_data(self, X_train: np.ndarray, y_train: np.ndarray, 
                           X_val: np.ndarray, y_val: np.ndarray,
                           X_test: np.ndarray, y_test: np.ndarray,
                           output_dir: Optional[str] = None) -> None:
        """Save processed data to files for later use
        
        Args:
            X_train: Training features
            y_train: Training labels
            X_val: Validation features
            y_val: Validation labels
            X_test: Test features
            y_test: Test labels
            output_dir: Directory to save the processed data
        """
        if output_dir is None:
            output_dir = os.path.join(self.data_dir, 'processed')
            
        # Create directory if it doesn't exist
        os.makedirs(output_dir, exist_ok=True)
        
        # Save numpy arrays
        np.save(os.path.join(output_dir, 'X_train.npy'), X_train)
        np.save(os.path.join(output_dir, 'y_train.npy'), y_train)
        np.save(os.path.join(output_dir, 'X_val.npy'), X_val)
        np.save(os.path.join(output_dir, 'y_val.npy'), y_val)
        np.save(os.path.join(output_dir, 'X_test.npy'), X_test)
        np.save(os.path.join(output_dir, 'y_test.npy'), y_test)
        
        # Save metadata
        if self.symptom_data is not None and len(self.symptom_data) > 0:
            self.symptom_data.to_csv(os.path.join(output_dir, 'symptom_metadata.csv'), index=False)
            
        if self.disease_data is not None and len(self.disease_data) > 0:
            self.disease_data.to_csv(os.path.join(output_dir, 'disease_metadata.csv'), index=False)


# Example usage
if __name__ == "__main__":
    loader = MedicalDataLoader()
    
    # Load data
    symptom_data = loader.load_symptom_data()
    disease_data = loader.load_disease_data()
    text_data = loader.load_symptom_text_data()
    
    print(f"Loaded {len(symptom_data)} symptoms")
    print(f"Loaded {len(disease_data)} diseases")
    print(f"Loaded {len(text_data)} text samples")
    
    # Prepare data for disease prediction
    X, y = loader.prepare_disease_prediction_data()
    
    if len(X) > 0 and len(y) > 0:
        # Split data
        X_train, X_val, X_test, y_train, y_val, y_test = loader.split_data(X, y)
        
        # Save processed data
        loader.save_processed_data(X_train, y_train, X_val, y_val, X_test, y_test)
        
        print(f"Processed and saved data: {len(X_train)} training samples, "
              f"{len(X_val)} validation samples, {len(X_test)} test samples")
    else:
        print("No data available for processing")