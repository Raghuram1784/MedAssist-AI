import json
import os
import pandas as pd
from typing import List, Dict, Any, Generator, Optional
from pydantic import BaseModel, Field, field_validator

class DifferentialItem(BaseModel):
    pathology: str
    probability: float

class PatientCase(BaseModel):
    age: int
    sex: str
    pathology: str
    evidences: List[str]
    differential_diagnosis: List[DifferentialItem]
    initial_evidence: str

    @field_validator('differential_diagnosis', mode='before')
    @classmethod
    def parse_differential(cls, v: Any) -> List[DifferentialItem]:
        if isinstance(v, str):
            try:
                # Parse string serialized list of lists, e.g. "[['GERD', 0.179], ...]"
                parsed = json.loads(v.replace("'", '"'))
                return [DifferentialItem(pathology=item[0], probability=float(item[1])) for item in parsed]
            except Exception as e:
                raise ValueError(f"Failed to parse differential diagnosis string: {e}")
        elif isinstance(v, list):
            result = []
            for item in v:
                if isinstance(item, DifferentialItem):
                    result.append(item)
                elif isinstance(item, (list, tuple)) and len(item) == 2:
                    result.append(DifferentialItem(pathology=item[0], probability=float(item[1])))
                else:
                    raise ValueError(f"Invalid differential item structure: {item}")
            return result
        return v

    @field_validator('evidences', mode='before')
    @classmethod
    def parse_evidences(cls, v: Any) -> List[str]:
        if isinstance(v, str):
            try:
                # Replace single quotes with double quotes for valid JSON
                return json.loads(v.replace("'", '"'))
            except Exception as e:
                raise ValueError(f"Failed to parse evidences string: {e}")
        elif isinstance(v, list):
            return [str(item) for item in v]
        return v


def load_conditions(filepath: str) -> Dict[str, Any]:
    """
    Load condition definitions from release_conditions.json.
    """
    if not os.path.exists(filepath):
        raise FileNotFoundError(f"Conditions metadata file not found at: {filepath}")
    with open(filepath, 'r', encoding='utf-8') as f:
        return json.load(f)


def load_evidences(filepath: str) -> Dict[str, Any]:
    """
    Load evidence definitions from release_evidences.json.
    """
    if not os.path.exists(filepath):
        raise FileNotFoundError(f"Evidences metadata file not found at: {filepath}")
    with open(filepath, 'r', encoding='utf-8') as f:
        return json.load(f)


def stream_cases(csv_filepath: str, limit: Optional[int] = None, chunksize: int = 1000) -> Generator[PatientCase, None, None]:
    """
    Stream patient cases from the raw CSV file to avoid loading the entire file into memory.
    
    Args:
        csv_filepath: Path to the CSV file.
        limit: Optional maximum number of rows to yield.
        chunksize: Size of chunks to read from the CSV file.
        
    Yields:
        Parsed PatientCase objects.
    """
    if not os.path.exists(csv_filepath):
        raise FileNotFoundError(f"CSV dataset not found at: {csv_filepath}")
        
    count = 0
    # Read CSV in chunks using pandas
    for chunk in pd.read_csv(csv_filepath, chunksize=chunksize):
        for _, row in chunk.iterrows():
            try:
                case = PatientCase(
                    age=int(row['AGE']),
                    sex=str(row['SEX']),
                    pathology=str(row['PATHOLOGY']),
                    evidences=row['EVIDENCES'],
                    differential_diagnosis=row['DIFFERENTIAL_DIAGNOSIS'],
                    initial_evidence=str(row['INITIAL_EVIDENCE'])
                )
                yield case
                count += 1
                if limit and count >= limit:
                    return
            except Exception as e:
                # In production, we might want to log this or handle it,
                # but during preprocessing, we want to know if there's corrupted data.
                raise ValueError(f"Error parsing row: {row.to_dict()} | Details: {e}")
