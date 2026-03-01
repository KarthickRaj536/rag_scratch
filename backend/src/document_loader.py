import os
from pathlib import Path


from langchain_community.document_loaders import (
    PyPDFLoader,      # Reads PDF files — returns one Document per page
    TextLoader,       # Reads plain .txt files — returns one Document per file
    Docx2txtLoader,   # Reads .docx (Word) files — returns one Document per file
)


def load_documents(data_dir: str) -> list:
    data_path = Path(data_dir)

    if not data_path.exists():
        raise FileNotFoundError(
            f"Data directory '{data_dir}' does not exist. "
            f"Please create it and add some .pdf, .txt, or .docx files."
        )

    all_documents = []  # We'll collect all Document objects here


    loader_map = {
        ".pdf":  PyPDFLoader,
        ".txt":  TextLoader,
        ".docx": Docx2txtLoader,
    }

    for file_path in sorted(data_path.rglob("*")):

        if not file_path.is_file():
            continue
        if file_path.name.startswith("."):
            continue

        file_ext = file_path.suffix.lower()  # e.g., ".pdf", ".txt", ".docx"
        if file_ext not in loader_map:
            print(f"  ⚠️  Skipping unsupported file type: {file_path.name} ({file_ext})")
            continue

        print(f"  📄 Loading: {file_path.name}")

        try:
            loader_class = loader_map[file_ext]
            loader = loader_class(str(file_path))

            documents = loader.load()

            print(f"      → Loaded {len(documents)} document chunk(s)")
            all_documents.extend(documents)

        except Exception as e:
            print(f"  ❌ Failed to load {file_path.name}: {e}")
            continue

    if len(all_documents) == 0:
        print(
            f"\n⚠️  No documents were loaded from '{data_dir}'.\n"
            f"   Add some .pdf, .txt, or .docx files and try again."
        )
    else:
        print(f"\n✅ Total documents loaded: {len(all_documents)}")

    return all_documents