#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Created on Sat Mar  8 13:59:30 2025

@author: davidooooo
"""





import pandas as pd



#%%
import json

def parse_rubric(file_path=r"/Users/davidooooo/Downloads/etl_rubric.xlsx", start_row=2):
    """
    Parses the rubric file based on the following pattern:
    
    - Row i (starting at start_row, default=2 for 0-indexed): 
        Criterion name in column A (index 0).
    - Row i+1: 
        Criterion description in column A (index 0) and rubric score values in columns B onward.
        The rubric score cells are read until a NaN is encountered.
    - Row i+2: 
        Word forms (e.g., "Meets Standard") for each rubric score (corresponding to the same columns as above).
    - Row i+3: 
        Detailed score descriptions corresponding to each rubric score.
    
    The process then repeats every 4 rows.
    
    Parameters:
        file_path (str): Path to the Excel file.
        start_row (int): The starting row index for the first criterion block (default is 2).
    
    Returns:
        str: A JSON-formatted string representing the parsed rubric.
    """

    # You're goint to run io operations to get the rubric
    # file_path will become a file id
    # Read the Excel file without assuming a header row.

   
    
    df = pd.read_excel(file_path, header=None)

    criteria = []
    num_rows, num_cols = df.shape
    
    # Process blocks of 4 rows at a time.
    for i in range(start_row, num_rows, 4):
        # Ensure there are enough rows for a complete block.
        if i + 3 >= num_rows:
            break
        
        # Extract the criterion name and description.
        criterion_name = df.iloc[i, 0]
        criterion_description = df.iloc[i+1, 0]
        
        # Parse rubric scores.
        rubric_scores = []
        # Start at column index 1 and loop until a NaN is encountered in row i+1.
        for j in range(1, num_cols):
            score_val = df.iloc[i+1, j]
            if pd.isna(score_val):
                break
            # Get the word form and score description from the corresponding cells.
            word_form = df.iloc[i+2, j]
            score_desc = df.iloc[i+3, j]
            rubric_scores.append({
                "score": score_val,
                "word": word_form,
                "description": score_desc
            })
        
        # Build the criterion object.
        criterion_obj = {
            "criterion": criterion_name,
            "description": criterion_description,
            "rubric_scores": rubric_scores
        }
        criteria.append(criterion_obj)
    
    # Convert the criteria list to a JSON string with indentation.
    json_str = json.dumps(criteria, indent=4)
    return json_str


if __name__ == '__main__':
    # Path to your Excel file (adjust if necessary)
    
    # Parse the rubric and convert it into a JSON string.
    json_output = parse_rubric(file_path)
    
    # Output the JSON string; you could also save it to a file.
    print("Extracted JSON:")
    print(json_output)
# Convert JSON string to Python dictionary
    data = json.loads(json_output)