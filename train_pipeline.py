"""Train AI/ML Pipeline

This script orchestrates the training of the entire AI/ML pipeline,
including data generation, symptom extraction, and disease prediction models.
"""

import os
import argparse
import logging
from pathlib import Path
from typing import Dict, Any, Optional

# Add the project root to the Python path
import sys
project_root = Path(__file__).parent.parent.absolute()
sys.path.insert(0, str(project_root))

from config import PATHS, DATA_CONFIG, MODEL_CONFIG, LOGGING_CONFIG
from training.data_generator import SyntheticDataGenerator
from training.data_loader import MedicalDataLoader
from training.symptom_extraction_trainer import SymptomExtractionTrainer
from training.model_trainer import DiseasePredictionTrainer
from training.model_evaluator import ModelEvaluator


# Configure logging
logging.basicConfig(
    level=getattr(logging, LOGGING_CONFIG["level"]),
    format=LOGGING_CONFIG["format"],
    handlers=[
        logging.StreamHandler(),
        logging.FileHandler(os.path.join(project_root, LOGGING_CONFIG["file"]))
    ]
)

logger = logging.getLogger(__name__)


def setup_directories() -> Dict[str, str]:
    """Set up the necessary directories for the AI/ML pipeline
    
    Returns:
        Dictionary of directory paths
    """
    directories = {
        "data": os.path.join(project_root, PATHS["data"]),
        "models": os.path.join(project_root, PATHS["models"]),
        "training": os.path.join(project_root, PATHS["training"]),
        "inference": os.path.join(project_root, PATHS["inference"]),
        "evaluation": os.path.join(project_root, PATHS["evaluation"])
    }
    
    # Create directories if they don't exist
    for directory in directories.values():
        os.makedirs(directory, exist_ok=True)
        logger.info(f"Directory created/verified: {directory}")
    
    return directories


def generate_synthetic_data(directories: Dict[str, str], args: argparse.Namespace) -> None:
    """Generate synthetic data for training
    
    Args:
        directories: Dictionary of directory paths
        args: Command-line arguments
    """
    logger.info("Generating synthetic data...")
    
    generator = SyntheticDataGenerator(
        output_dir=directories["data"],
        seed=args.seed
    )
    
    generator.generate_all_data(
        num_symptoms=args.num_symptoms,
        num_diseases=args.num_diseases,
        num_text_samples=args.num_text_samples,
        num_cases=args.num_cases
    )
    
    logger.info("Synthetic data generation complete")


def prepare_training_data(directories: Dict[str, str], args: argparse.Namespace) -> Dict[str, str]:
    """Prepare training data for models
    
    Args:
        directories: Dictionary of directory paths
        args: Command-line arguments
        
    Returns:
        Dictionary of data file paths
    """
    logger.info("Preparing training data...")
    
    data_loader = MedicalDataLoader(
        data_dir=directories["data"],
        output_dir=directories["training"]
    )
    
    # Load symptom data
    symptom_data_path = os.path.join(directories["data"], DATA_CONFIG["symptom_data_file"])
    data_loader.load_symptom_data(symptom_data_path)
    
    # Load disease data
    disease_data_path = os.path.join(directories["data"], DATA_CONFIG["disease_data_file"])
    data_loader.load_disease_data(disease_data_path)
    
    # Load symptom text data
    symptom_text_data_path = os.path.join(directories["data"], DATA_CONFIG["symptom_text_data_file"])
    data_loader.load_symptom_text_data(symptom_text_data_path)
    
    # Load symptom-disease relationship data
    relationship_data_path = os.path.join(directories["data"], DATA_CONFIG["symptom_disease_relationship_file"])
    data_loader.load_symptom_disease_relationships(relationship_data_path)
    
    # Prepare data for symptom extraction model
    symptom_extraction_data = data_loader.prepare_symptom_extraction_data(
        test_size=args.test_size,
        validation_size=args.validation_size,
        random_state=args.seed
    )
    
    # Prepare data for disease prediction model
    disease_prediction_data = data_loader.prepare_disease_prediction_data(
        test_size=args.test_size,
        validation_size=args.validation_size,
        random_state=args.seed
    )
    
    # Save processed data
    data_paths = data_loader.save_processed_data()
    
    logger.info("Training data preparation complete")
    
    return data_paths


def train_symptom_extraction_model(directories: Dict[str, str], 
                                 data_paths: Dict[str, str], 
                                 args: argparse.Namespace) -> None:
    """Train the symptom extraction model
    
    Args:
        directories: Dictionary of directory paths
        data_paths: Dictionary of data file paths
        args: Command-line arguments
    """
    logger.info("Training symptom extraction model...")
    
    trainer = SymptomExtractionTrainer(
        model_name=args.symptom_model,
        max_length=args.max_sequence_length,
        batch_size=args.batch_size,
        learning_rate=args.learning_rate,
        epochs=args.epochs,
        output_dir=os.path.join(directories["models"], "symptom_extraction")
    )
    
    trainer.train_all_models(data_paths["symptom_text_train"])
    
    logger.info("Symptom extraction model training complete")


def train_disease_prediction_model(directories: Dict[str, str], 
                                 data_paths: Dict[str, str], 
                                 args: argparse.Namespace) -> None:
    """Train the disease prediction model
    
    Args:
        directories: Dictionary of directory paths
        data_paths: Dictionary of data file paths
        args: Command-line arguments
    """
    logger.info("Training disease prediction model...")
    
    trainer = DiseasePredictionTrainer(
        output_dir=os.path.join(directories["models"], "disease_prediction"),
        random_state=args.seed
    )
    
    # Load training data
    trainer.load_data(
        data_paths["disease_prediction_train"],
        data_paths["disease_prediction_val"]
    )
    
    # Train models
    if args.train_random_forest:
        trainer.train_random_forest(
            n_estimators=args.rf_n_estimators,
            max_depth=args.rf_max_depth
        )
    
    if args.train_gradient_boosting:
        trainer.train_gradient_boosting(
            n_estimators=args.gb_n_estimators,
            learning_rate=args.gb_learning_rate,
            max_depth=args.gb_max_depth
        )
    
    if args.train_neural_network:
        trainer.train_neural_network(
            hidden_layer_sizes=args.nn_hidden_layer_sizes,
            learning_rate_init=args.nn_learning_rate,
            max_iter=args.nn_max_iter
        )
    
    # Evaluate and save models
    trainer.evaluate_models()
    trainer.save_models()
    
    logger.info("Disease prediction model training complete")


def evaluate_models(directories: Dict[str, str], 
                  data_paths: Dict[str, str], 
                  args: argparse.Namespace) -> None:
    """Evaluate the trained models
    
    Args:
        directories: Dictionary of directory paths
        data_paths: Dictionary of data file paths
        args: Command-line arguments
    """
    logger.info("Evaluating models...")
    
    evaluator = ModelEvaluator(
        output_dir=directories["evaluation"]
    )
    
    # Evaluate symptom extraction model
    symptom_extraction_model_dir = os.path.join(directories["models"], "symptom_extraction")
    evaluator.evaluate_symptom_extraction(
        symptom_extraction_model_dir,
        data_paths["symptom_text_test"]
    )
    
    # Evaluate disease prediction model
    disease_prediction_model_dir = os.path.join(directories["models"], "disease_prediction")
    evaluator.evaluate_disease_prediction(
        disease_prediction_model_dir,
        data_paths["disease_prediction_test"]
    )
    
    # Evaluate end-to-end pipeline
    evaluator.evaluate_end_to_end(
        symptom_extraction_model_dir,
        disease_prediction_model_dir,
        data_paths["end_to_end_test"]
    )
    
    logger.info("Model evaluation complete")


def main(args: argparse.Namespace) -> None:
    """Main function to run the AI/ML pipeline training
    
    Args:
        args: Command-line arguments
    """
    logger.info("Starting AI/ML pipeline training")
    
    # Set up directories
    directories = setup_directories()
    
    # Generate synthetic data if requested
    if args.generate_data:
        generate_synthetic_data(directories, args)
    
    # Prepare training data
    data_paths = prepare_training_data(directories, args)
    
    # Train symptom extraction model if requested
    if args.train_symptom_extraction:
        train_symptom_extraction_model(directories, data_paths, args)
    
    # Train disease prediction model if requested
    if args.train_disease_prediction:
        train_disease_prediction_model(directories, data_paths, args)
    
    # Evaluate models if requested
    if args.evaluate_models:
        evaluate_models(directories, data_paths, args)
    
    logger.info("AI/ML pipeline training complete")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Train AI/ML pipeline")
    
    # General options
    parser.add_argument("--seed", type=int, default=42, 
                        help="Random seed for reproducibility")
    parser.add_argument("--test-size", type=float, default=0.2, 
                        help="Test set size")
    parser.add_argument("--validation-size", type=float, default=0.1, 
                        help="Validation set size")
    
    # Data generation options
    parser.add_argument("--generate-data", action="store_true", 
                        help="Generate synthetic data")
    parser.add_argument("--num-symptoms", type=int, default=50, 
                        help="Number of symptoms to generate")
    parser.add_argument("--num-diseases", type=int, default=20, 
                        help="Number of diseases to generate")
    parser.add_argument("--num-text-samples", type=int, default=100, 
                        help="Number of text samples to generate")
    parser.add_argument("--num-cases", type=int, default=200, 
                        help="Number of cases to generate")
    
    # Symptom extraction model options
    parser.add_argument("--train-symptom-extraction", action="store_true", 
                        help="Train symptom extraction model")
    parser.add_argument("--symptom-model", type=str, default="emilyalsentzer/Bio_ClinicalBERT", 
                        help="Transformer model for symptom extraction")
    parser.add_argument("--max-sequence-length", type=int, default=128, 
                        help="Maximum sequence length for tokenization")
    
    # Disease prediction model options
    parser.add_argument("--train-disease-prediction", action="store_true", 
                        help="Train disease prediction model")
    parser.add_argument("--train-random-forest", action="store_true", 
                        help="Train random forest model")
    parser.add_argument("--train-gradient-boosting", action="store_true", 
                        help="Train gradient boosting model")
    parser.add_argument("--train-neural-network", action="store_true", 
                        help="Train neural network model")
    
    # Random forest parameters
    parser.add_argument("--rf-n-estimators", type=int, default=100, 
                        help="Number of trees in random forest")
    parser.add_argument("--rf-max-depth", type=int, default=None, 
                        help="Maximum depth of trees in random forest")
    
    # Gradient boosting parameters
    parser.add_argument("--gb-n-estimators", type=int, default=100, 
                        help="Number of boosting stages in gradient boosting")
    parser.add_argument("--gb-learning-rate", type=float, default=0.1, 
                        help="Learning rate in gradient boosting")
    parser.add_argument("--gb-max-depth", type=int, default=3, 
                        help="Maximum depth of trees in gradient boosting")
    
    # Neural network parameters
    parser.add_argument("--nn-hidden-layer-sizes", type=str, default="100,100", 
                        help="Hidden layer sizes in neural network (comma-separated)")
    parser.add_argument("--nn-learning-rate", type=float, default=0.001, 
                        help="Learning rate in neural network")
    parser.add_argument("--nn-max-iter", type=int, default=200, 
                        help="Maximum number of iterations in neural network")
    
    # Training parameters
    parser.add_argument("--batch-size", type=int, default=16, 
                        help="Batch size for training")
    parser.add_argument("--learning-rate", type=float, default=2e-5, 
                        help="Learning rate for training")
    parser.add_argument("--epochs", type=int, default=3, 
                        help="Number of epochs to train for")
    
    # Evaluation options
    parser.add_argument("--evaluate-models", action="store_true", 
                        help="Evaluate trained models")
    
    args = parser.parse_args()
    
    # Convert nn_hidden_layer_sizes from string to tuple
    if args.nn_hidden_layer_sizes:
        args.nn_hidden_layer_sizes = tuple(map(int, args.nn_hidden_layer_sizes.split(',')))
    
    main(args)