import os

def rename_files_numerically(directory_path, file_extension=None, keep_extension=True):
    """
    Rename files in a directory to numerical names (1, 2, 3, etc.)
    """
    # Check if directory exists
    if not os.path.exists(directory_path):
        print(f"Error: Directory '{directory_path}' does not exist.")
        return
    
    # Get all files in the directory
    all_items = os.listdir(directory_path)
    files = [item for item in all_items if os.path.isfile(os.path.join(directory_path, item))]
    
    # Filter by extension if specified
    if file_extension:
        files = [f for f in files if f.lower().endswith(file_extension.lower())]
    
    # Sort files alphabetically
    files.sort()
    
    if not files:
        print("No files found to rename.")
        return
    
    print(f"Found {len(files)} files to rename:")
    
    # Rename files
    for i, filename in enumerate(files, 1):
        name, extension = os.path.splitext(filename)
        
        if keep_extension and extension:
            new_filename = f"4.{i}{extension}"
        else:
            new_filename = str(i)
        
        old_path = os.path.join(directory_path, filename)
        new_path = os.path.join(directory_path, new_filename)
        
        if os.path.exists(new_path):
            print(f"Warning: {new_filename} already exists. Skipping {filename}")
            continue
        
        try:
            os.rename(old_path, new_path)
            print(f"Renamed: {filename} -> {new_filename}")
        except OSError as e:
            print(f"Error renaming {filename}: {e}")

# Usage examples with different ways to write paths:

# Method 1: Raw string (recommended)
rename_files_numerically(r"C:\Users\W11\OneDrive\Pictures\MM-Screenshots\Chapter 4")

