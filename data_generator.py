"""Data Generator for AI/ML Training

This module provides functionality to generate synthetic data for training
the symptom extraction and disease prediction models when real data is limited.
"""

import os
import json
import random
import numpy as np
import pandas as pd
from pathlib import Path
from typing import Dict, List, Tuple, Any, Optional

# Add the project root to the Python path
import sys
project_root = Path(__file__).parent.parent.absolute()
sys.path.insert(0, str(project_root))

from config import DATA_CONFIG


class SyntheticDataGenerator:
    """Class for generating synthetic medical data for AI/ML training"""
    
    def __init__(self, output_dir: Optional[str] = None, seed: int = 42):
        """Initialize the data generator
        
        Args:
            output_dir: Directory to save generated data
            seed: Random seed for reproducibility
        """
        self.output_dir = output_dir or os.path.join(project_root, 'data')
        self.seed = seed
        
        # Set random seed for reproducibility
        random.seed(seed)
        np.random.seed(seed)
        
        # Create output directory if it doesn't exist
        os.makedirs(self.output_dir, exist_ok=True)
        
        # Load base data if available
        self.base_symptoms = self._load_base_symptoms()
        self.base_diseases = self._load_base_diseases()
    
    def _load_base_symptoms(self) -> List[Dict[str, Any]]:
        """Load base symptom data if available
        
        Returns:
            List of symptom dictionaries
        """
        base_file = os.path.join(self.output_dir, 'base_symptoms.json')
        
        if os.path.exists(base_file):
            with open(base_file, 'r') as f:
                return json.load(f)
        
        # Return a minimal set of common symptoms if no base file exists
        return [
            {
                "symptom_id": "S001",
                "name": "Fever",
                "description": "Elevated body temperature above normal range",
                "category": "General",
                "body_part": "Systemic",
                "severity_scale": "mild,moderate,severe",
                "common_duration": "3-7 days",
                "icd_code": "R50.9",
                "snomed_code": "386661006"
            },
            {
                "symptom_id": "S002",
                "name": "Cough",
                "description": "Sudden expulsion of air from the lungs",
                "category": "Respiratory",
                "body_part": "Chest",
                "severity_scale": "mild,moderate,severe",
                "common_duration": "7-14 days",
                "icd_code": "R05",
                "snomed_code": "49727002"
            },
            {
                "symptom_id": "S003",
                "name": "Headache",
                "description": "Pain in the head or upper neck",
                "category": "Neurological",
                "body_part": "Head",
                "severity_scale": "mild,moderate,severe",
                "common_duration": "1-24 hours",
                "icd_code": "R51",
                "snomed_code": "25064002"
            },
            {
                "symptom_id": "S004",
                "name": "Fatigue",
                "description": "Feeling of tiredness or exhaustion",
                "category": "General",
                "body_part": "Systemic",
                "severity_scale": "mild,moderate,severe",
                "common_duration": "variable",
                "icd_code": "R53.83",
                "snomed_code": "84229001"
            },
            {
                "symptom_id": "S005",
                "name": "Nausea",
                "description": "Sensation of unease in the stomach with an urge to vomit",
                "category": "Gastrointestinal",
                "body_part": "Abdomen",
                "severity_scale": "mild,moderate,severe",
                "common_duration": "1-48 hours",
                "icd_code": "R11.0",
                "snomed_code": "422587007"
            }
        ]
    
    def _load_base_diseases(self) -> List[Dict[str, Any]]:
        """Load base disease data if available
        
        Returns:
            List of disease dictionaries
        """
        base_file = os.path.join(self.output_dir, 'base_diseases.json')
        
        if os.path.exists(base_file):
            with open(base_file, 'r') as f:
                return json.load(f)
        
        # Return a minimal set of common diseases if no base file exists
        return [
            {
                "disease_id": "D001",
                "name": "Common Cold",
                "description": "Viral infection of the upper respiratory tract",
                "category": "Infectious",
                "icd_code": "J00",
                "snomed_code": "82272006",
                "common_symptoms": ["S002", "S003", "S004"],
                "required_symptoms": ["S002"],
                "exclusionary_symptoms": [],
                "prevalence": "high",
                "severity": "mild"
            },
            {
                "disease_id": "D002",
                "name": "Influenza",
                "description": "Viral infection that attacks the respiratory system",
                "category": "Infectious",
                "icd_code": "J10.1",
                "snomed_code": "6142004",
                "common_symptoms": ["S001", "S002", "S003", "S004"],
                "required_symptoms": ["S001", "S004"],
                "exclusionary_symptoms": [],
                "prevalence": "seasonal",
                "severity": "moderate"
            },
            {
                "disease_id": "D003",
                "name": "Migraine",
                "description": "Recurring headache that causes moderate to severe pain",
                "category": "Neurological",
                "icd_code": "G43.909",
                "snomed_code": "37796009",
                "common_symptoms": ["S003", "S005"],
                "required_symptoms": ["S003"],
                "exclusionary_symptoms": [],
                "prevalence": "moderate",
                "severity": "moderate"
            },
            {
                "disease_id": "D004",
                "name": "Gastroenteritis",
                "description": "Inflammation of the stomach and intestines",
                "category": "Gastrointestinal",
                "icd_code": "A09",
                "snomed_code": "25374005",
                "common_symptoms": ["S001", "S004", "S005"],
                "required_symptoms": ["S005"],
                "exclusionary_symptoms": [],
                "prevalence": "high",
                "severity": "moderate"
            }
        ]
    
    def generate_symptoms(self, num_symptoms: int = 50) -> List[Dict[str, Any]]:
        """Generate synthetic symptom data
        
        Args:
            num_symptoms: Number of symptoms to generate
            
        Returns:
            List of symptom dictionaries
        """
        # Start with base symptoms
        symptoms = self.base_symptoms.copy()
        
        # Generate additional symptoms if needed
        if len(symptoms) < num_symptoms:
            categories = ["General", "Respiratory", "Cardiovascular", "Gastrointestinal", 
                        "Neurological", "Musculoskeletal", "Dermatological", "Urological", 
                        "Psychological", "Endocrine"]
            
            body_parts = ["Head", "Neck", "Chest", "Abdomen", "Back", "Arms", "Legs", 
                        "Joints", "Skin", "Systemic"]
            
            # Generate additional symptoms
            for i in range(len(symptoms), num_symptoms):
                symptom_id = f"S{i+1:03d}"
                
                # Generate a random symptom name and description
                category = random.choice(categories)
                body_part = random.choice(body_parts)
                
                # Generate a symptom name based on category and body part
                name_prefixes = {
                    "General": ["Generalized", "Systemic", "Chronic", "Acute"],
                    "Respiratory": ["Wheezing", "Congested", "Labored", "Restricted"],
                    "Cardiovascular": ["Rapid", "Irregular", "Weak", "Strong"],
                    "Gastrointestinal": ["Upset", "Bloated", "Irritated", "Inflamed"],
                    "Neurological": ["Tingling", "Numb", "Sensitive", "Painful"],
                    "Musculoskeletal": ["Stiff", "Sore", "Weak", "Cramping"],
                    "Dermatological": ["Itchy", "Red", "Dry", "Flaky"],
                    "Urological": ["Frequent", "Painful", "Difficult", "Urgent"],
                    "Psychological": ["Anxious", "Depressed", "Confused", "Irritable"],
                    "Endocrine": ["Excessive", "Insufficient", "Irregular", "Abnormal"]
                }
                
                name_suffixes = {
                    "General": ["discomfort", "malaise", "weakness", "pain"],
                    "Respiratory": ["breathing", "respiration", "cough", "congestion"],
                    "Cardiovascular": ["heartbeat", "pulse", "circulation", "pressure"],
                    "Gastrointestinal": ["stomach", "digestion", "bowel movement", "appetite"],
                    "Neurological": ["sensation", "coordination", "balance", "consciousness"],
                    "Musculoskeletal": ["movement", "flexibility", "strength", "posture"],
                    "Dermatological": ["skin", "rash", "lesion", "discoloration"],
                    "Urological": ["urination", "bladder control", "kidney function", "hydration"],
                    "Psychological": ["mood", "thought process", "behavior", "sleep pattern"],
                    "Endocrine": ["metabolism", "hormone levels", "energy", "temperature regulation"]
                }
                
                name = f"{random.choice(name_prefixes[category])} {random.choice(name_suffixes[category])}"
                
                # Generate a description
                description = f"A {category.lower()} symptom affecting the {body_part.lower()}"
                
                # Generate severity scale and duration
                severity_scale = "mild,moderate,severe"
                durations = ["1-3 days", "3-7 days", "7-14 days", "2-4 weeks", "variable"]
                common_duration = random.choice(durations)
                
                # Generate ICD and SNOMED codes (simplified for synthetic data)
                icd_code = f"R{random.randint(10, 99)}.{random.randint(0, 9)}"
                snomed_code = f"{random.randint(10000000, 99999999)}"
                
                # Create the symptom dictionary
                symptom = {
                    "symptom_id": symptom_id,
                    "name": name,
                    "description": description,
                    "category": category,
                    "body_part": body_part,
                    "severity_scale": severity_scale,
                    "common_duration": common_duration,
                    "icd_code": icd_code,
                    "snomed_code": snomed_code
                }
                
                symptoms.append(symptom)
        
        return symptoms
    
    def generate_diseases(self, symptoms: List[Dict[str, Any]], num_diseases: int = 20) -> List[Dict[str, Any]]:
        """Generate synthetic disease data
        
        Args:
            symptoms: List of symptom dictionaries
            num_diseases: Number of diseases to generate
            
        Returns:
            List of disease dictionaries
        """
        # Start with base diseases
        diseases = self.base_diseases.copy()
        
        # Get symptom IDs
        symptom_ids = [s["symptom_id"] for s in symptoms]
        
        # Generate additional diseases if needed
        if len(diseases) < num_diseases:
            categories = ["Infectious", "Cardiovascular", "Respiratory", "Gastrointestinal", 
                        "Neurological", "Musculoskeletal", "Dermatological", "Urological", 
                        "Psychological", "Endocrine", "Autoimmune", "Oncological"]
            
            # Generate additional diseases
            for i in range(len(diseases), num_diseases):
                disease_id = f"D{i+1:03d}"
                
                # Generate a random disease name and description
                category = random.choice(categories)
                
                # Generate a disease name based on category
                name_prefixes = {
                    "Infectious": ["Viral", "Bacterial", "Fungal", "Parasitic"],
                    "Cardiovascular": ["Acute", "Chronic", "Congestive", "Ischemic"],
                    "Respiratory": ["Obstructive", "Restrictive", "Inflammatory", "Infectious"],
                    "Gastrointestinal": ["Inflammatory", "Obstructive", "Malabsorptive", "Infectious"],
                    "Neurological": ["Degenerative", "Inflammatory", "Vascular", "Traumatic"],
                    "Musculoskeletal": ["Inflammatory", "Degenerative", "Traumatic", "Metabolic"],
                    "Dermatological": ["Inflammatory", "Infectious", "Allergic", "Autoimmune"],
                    "Urological": ["Obstructive", "Infectious", "Inflammatory", "Neoplastic"],
                    "Psychological": ["Affective", "Anxiety", "Psychotic", "Cognitive"],
                    "Endocrine": ["Hyper-", "Hypo-", "Autoimmune", "Neoplastic"],
                    "Autoimmune": ["Systemic", "Organ-specific", "Mixed", "Undifferentiated"],
                    "Oncological": ["Metastatic", "Primary", "Benign", "Malignant"]
                }
                
                name_suffixes = {
                    "Infectious": ["infection", "disease", "syndrome", "fever"],
                    "Cardiovascular": ["heart disease", "cardiomyopathy", "arrhythmia", "vascular disease"],
                    "Respiratory": ["pneumonia", "disease", "syndrome", "failure"],
                    "Gastrointestinal": ["disease", "syndrome", "disorder", "inflammation"],
                    "Neurological": ["neuropathy", "disorder", "disease", "syndrome"],
                    "Musculoskeletal": ["arthritis", "myopathy", "disease", "syndrome"],
                    "Dermatological": ["dermatitis", "disease", "condition", "disorder"],
                    "Urological": ["nephropathy", "disease", "syndrome", "failure"],
                    "Psychological": ["disorder", "syndrome", "condition", "disease"],
                    "Endocrine": ["disorder", "disease", "syndrome", "dysfunction"],
                    "Autoimmune": ["disease", "syndrome", "disorder", "condition"],
                    "Oncological": ["cancer", "tumor", "neoplasm", "carcinoma"]
                }
                
                name = f"{random.choice(name_prefixes[category])} {random.choice(name_suffixes[category])}"
                
                # Generate a description
                description = f"A {category.lower()} condition characterized by specific symptoms"
                
                # Generate ICD and SNOMED codes (simplified for synthetic data)
                if category == "Infectious":
                    icd_code = f"A{random.randint(10, 99)}.{random.randint(0, 9)}"
                elif category == "Cardiovascular":
                    icd_code = f"I{random.randint(10, 99)}.{random.randint(0, 9)}"
                elif category == "Respiratory":
                    icd_code = f"J{random.randint(10, 99)}.{random.randint(0, 9)}"
                elif category == "Gastrointestinal":
                    icd_code = f"K{random.randint(10, 99)}.{random.randint(0, 9)}"
                elif category == "Neurological":
                    icd_code = f"G{random.randint(10, 99)}.{random.randint(0, 9)}"
                else:
                    icd_code = f"R{random.randint(10, 99)}.{random.randint(0, 9)}"
                
                snomed_code = f"{random.randint(10000000, 99999999)}"
                
                # Assign symptoms to the disease
                # Each disease should have 2-5 common symptoms
                num_common_symptoms = random.randint(2, min(5, len(symptom_ids)))
                common_symptoms = random.sample(symptom_ids, num_common_symptoms)
                
                # Each disease should have 1-2 required symptoms
                num_required_symptoms = random.randint(1, min(2, num_common_symptoms))
                required_symptoms = random.sample(common_symptoms, num_required_symptoms)
                
                # Some diseases might have exclusionary symptoms
                exclusionary_symptoms = []
                if random.random() < 0.3:  # 30% chance of having exclusionary symptoms
                    available_symptoms = [s for s in symptom_ids if s not in common_symptoms]
                    if available_symptoms:
                        num_exclusionary = random.randint(1, min(2, len(available_symptoms)))
                        exclusionary_symptoms = random.sample(available_symptoms, num_exclusionary)
                
                # Generate prevalence and severity
                prevalences = ["rare", "low", "moderate", "high", "seasonal"]
                severities = ["mild", "moderate", "severe", "critical"]
                
                prevalence = random.choice(prevalences)
                severity = random.choice(severities)
                
                # Create the disease dictionary
                disease = {
                    "disease_id": disease_id,
                    "name": name,
                    "description": description,
                    "category": category,
                    "icd_code": icd_code,
                    "snomed_code": snomed_code,
                    "common_symptoms": common_symptoms,
                    "required_symptoms": required_symptoms,
                    "exclusionary_symptoms": exclusionary_symptoms,
                    "prevalence": prevalence,
                    "severity": severity
                }
                
                diseases.append(disease)
        
        return diseases
    
    def generate_symptom_text_data(self, symptoms: List[Dict[str, Any]], 
                                 diseases: List[Dict[str, Any]], 
                                 num_samples: int = 100) -> List[Dict[str, Any]]:
        """Generate synthetic text data with symptom annotations
        
        Args:
            symptoms: List of symptom dictionaries
            diseases: List of disease dictionaries
            num_samples: Number of text samples to generate
            
        Returns:
            List of text data dictionaries with annotations
        """
        text_data = []
        
        # Create a mapping of symptom IDs to names
        symptom_map = {s["symptom_id"]: s["name"] for s in symptoms}
        
        # Templates for generating text
        templates = [
            "I've been experiencing {symptoms} for {duration}.",
            "I have {symptoms} that started {duration} ago.",
            "My symptoms include {symptoms} for the past {duration}.",
            "For about {duration}, I've had {symptoms}.",
            "I'm concerned about {symptoms} that I've had for {duration}."
        ]
        
        durations = [
            "a few hours", "a day", "two days", "three days", "a week",
            "two weeks", "a month", "several months"
        ]
        
        # Generate text samples
        for i in range(num_samples):
            # Select a random disease
            disease = random.choice(diseases)
            
            # Get symptoms associated with this disease
            disease_symptoms = disease["common_symptoms"]
            
            # Select a subset of symptoms to include in the text
            num_symptoms_to_include = random.randint(1, min(3, len(disease_symptoms)))
            selected_symptom_ids = random.sample(disease_symptoms, num_symptoms_to_include)
            
            # Get the names of the selected symptoms
            selected_symptoms = [symptom_map[s_id] for s_id in selected_symptom_ids if s_id in symptom_map]
            
            # Format the symptoms as text
            if len(selected_symptoms) == 1:
                symptoms_text = selected_symptoms[0]
            elif len(selected_symptoms) == 2:
                symptoms_text = f"{selected_symptoms[0]} and {selected_symptoms[1]}"
            else:
                symptoms_text = ", ".join(selected_symptoms[:-1]) + f", and {selected_symptoms[-1]}"
            
            # Select a random duration
            duration = random.choice(durations)
            
            # Select a random template and fill it
            template = random.choice(templates)
            text = template.format(symptoms=symptoms_text, duration=duration)
            
            # Create annotations for the symptoms in the text
            annotations = []
            for symptom_id in selected_symptom_ids:
                if symptom_id in symptom_map:
                    symptom_name = symptom_map[symptom_id]
                    # Find the position of the symptom name in the text
                    start_idx = text.lower().find(symptom_name.lower())
                    if start_idx != -1:
                        end_idx = start_idx + len(symptom_name)
                        annotations.append({
                            "start": start_idx,
                            "end": end_idx,
                            "text": text[start_idx:end_idx],
                            "symptom_id": symptom_id,
                            "negated": False
                        })
            
            # Create the text data dictionary
            text_data.append({
                "text_id": f"T{i+1:03d}",
                "text": text,
                "annotations": annotations,
                "source": "synthetic"
            })
        
        return text_data
    
    def generate_symptom_disease_relationships(self, symptoms: List[Dict[str, Any]], 
                                             diseases: List[Dict[str, Any]], 
                                             num_cases: int = 200) -> List[Dict[str, Any]]:
        """Generate synthetic symptom-disease relationship data
        
        Args:
            symptoms: List of symptom dictionaries
            diseases: List of disease dictionaries
            num_cases: Number of cases to generate
            
        Returns:
            List of relationship dictionaries
        """
        relationships = []
        
        # Generate cases
        for i in range(num_cases):
            case_id = f"C{i+1:03d}"
            
            # Select a random disease
            disease = random.choice(diseases)
            disease_id = disease["disease_id"]
            
            # Get symptoms associated with this disease
            common_symptoms = disease["common_symptoms"]
            required_symptoms = disease["required_symptoms"]
            exclusionary_symptoms = disease["exclusionary_symptoms"]
            
            # Include all required symptoms
            selected_symptoms = required_symptoms.copy()
            
            # Include some common symptoms
            remaining_common = [s for s in common_symptoms if s not in selected_symptoms]
            num_common_to_include = random.randint(0, len(remaining_common))
            if num_common_to_include > 0 and remaining_common:
                selected_symptoms.extend(random.sample(remaining_common, num_common_to_include))
            
            # Add some random symptoms that are not exclusionary
            all_symptom_ids = [s["symptom_id"] for s in symptoms]
            available_symptoms = [s for s in all_symptom_ids 
                                if s not in selected_symptoms and s not in exclusionary_symptoms]
            
            # 30% chance to include additional symptoms
            if random.random() < 0.3 and available_symptoms:
                num_additional = random.randint(1, min(2, len(available_symptoms)))
                selected_symptoms.extend(random.sample(available_symptoms, num_additional))
            
            # Create relationship entries for each symptom in this case
            for symptom_id in selected_symptoms:
                # Determine if this is a required symptom
                is_required = symptom_id in required_symptoms
                
                # Generate severity and duration for this symptom
                severities = ["mild", "moderate", "severe"]
                severity = random.choice(severities)
                
                durations = ["hours", "days", "weeks", "months"]
                duration = random.choice(durations)
                
                # Create the relationship dictionary
                relationship = {
                    "case_id": case_id,
                    "disease_id": disease_id,
                    "symptom_id": symptom_id,
                    "is_required": is_required,
                    "severity": severity,
                    "duration": duration
                }
                
                relationships.append(relationship)
        
        return relationships
    
    def save_data(self, symptoms: List[Dict[str, Any]], 
                 diseases: List[Dict[str, Any]], 
                 text_data: List[Dict[str, Any]], 
                 relationships: List[Dict[str, Any]]) -> None:
        """Save generated data to files
        
        Args:
            symptoms: List of symptom dictionaries
            diseases: List of disease dictionaries
            text_data: List of text data dictionaries
            relationships: List of relationship dictionaries
        """
        # Save symptoms
        with open(os.path.join(self.output_dir, DATA_CONFIG["symptom_data_file"]), 'w') as f:
            json.dump(symptoms, f, indent=2)
        
        # Save diseases
        with open(os.path.join(self.output_dir, DATA_CONFIG["disease_data_file"]), 'w') as f:
            json.dump(diseases, f, indent=2)
        
        # Save text data
        with open(os.path.join(self.output_dir, DATA_CONFIG["symptom_text_data_file"]), 'w') as f:
            json.dump(text_data, f, indent=2)
        
        # Save relationships
        with open(os.path.join(self.output_dir, DATA_CONFIG["symptom_disease_relationship_file"]), 'w') as f:
            json.dump(relationships, f, indent=2)
        
        print(f"Data saved to {self.output_dir}")
    
    def generate_all_data(self, num_symptoms: int = 50, num_diseases: int = 20, 
                         num_text_samples: int = 100, num_cases: int = 200) -> Dict[str, List[Dict[str, Any]]]:
        """Generate all synthetic data
        
        Args:
            num_symptoms: Number of symptoms to generate
            num_diseases: Number of diseases to generate
            num_text_samples: Number of text samples to generate
            num_cases: Number of cases to generate
            
        Returns:
            Dictionary containing all generated data
        """
        print(f"Generating {num_symptoms} symptoms...")
        symptoms = self.generate_symptoms(num_symptoms)
        
        print(f"Generating {num_diseases} diseases...")
        diseases = self.generate_diseases(symptoms, num_diseases)
        
        print(f"Generating {num_text_samples} text samples...")
        text_data = self.generate_symptom_text_data(symptoms, diseases, num_text_samples)
        
        print(f"Generating {num_cases} symptom-disease relationships...")
        relationships = self.generate_symptom_disease_relationships(symptoms, diseases, num_cases)
        
        # Save the generated data
        self.save_data(symptoms, diseases, text_data, relationships)
        
        return {
            "symptoms": symptoms,
            "diseases": diseases,
            "text_data": text_data,
            "relationships": relationships
        }


# Example usage
if __name__ == "__main__":
    import argparse
    
    parser = argparse.ArgumentParser(description="Generate synthetic medical data for AI/ML training")
    parser.add_argument("--output-dir", type=str, help="Directory to save generated data")
    parser.add_argument("--num-symptoms", type=int, default=50, help="Number of symptoms to generate")
    parser.add_argument("--num-diseases", type=int, default=20, help="Number of diseases to generate")
    parser.add_argument("--num-text-samples", type=int, default=100, help="Number of text samples to generate")
    parser.add_argument("--num-cases", type=int, default=200, help="Number of cases to generate")
    parser.add_argument("--seed", type=int, default=42, help="Random seed for reproducibility")
    
    args = parser.parse_args()
    
    generator = SyntheticDataGenerator(output_dir=args.output_dir, seed=args.seed)
    generator.generate_all_data(
        num_symptoms=args.num_symptoms,
        num_diseases=args.num_diseases,
        num_text_samples=args.num_text_samples,
        num_cases=args.num_cases
    )