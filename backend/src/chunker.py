from langchain_text_splitters import RecursiveCharacterTextSplitter


def chunk_documents(
    documents: list,
    chunk_size: int = 500,
    chunk_overlap: int = 50,
) -> list:

    print(f"\n📐 Chunking {len(documents)} document(s)...")
    print(f"   Settings: chunk_size={chunk_size}, chunk_overlap={chunk_overlap}")

    splitter = RecursiveCharacterTextSplitter(
        chunk_size=chunk_size,
        chunk_overlap=chunk_overlap,
        separators=["\n\n", "\n", " ", ""],
        length_function=len,
    )

    chunks = splitter.split_documents(documents)

    print(f"✅ Created {len(chunks)} chunks from {len(documents)} document(s)")
    print(
        f"   Average chunk size: "
        f"~{sum(len(c.page_content) for c in chunks) // max(len(chunks), 1)} characters"
    )

    return chunks