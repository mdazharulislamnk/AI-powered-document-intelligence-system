from fastapi import UploadFile
from pypdf import PdfReader
import io
from langchain_text_splitters import RecursiveCharacterTextSplitter

async def process_document(file: UploadFile):
    content = await file.read()
    pages = []
    
    if file.filename.endswith('.pdf'):
        pdf = PdfReader(io.BytesIO(content))
        for i, page in enumerate(pdf.pages):
            text = page.extract_text()
            if text:
                pages.append({"text": text, "page": i + 1})
    else:
        text = content.decode('utf-8')
        pages.append({"text": text, "page": 1})

    splitter = RecursiveCharacterTextSplitter(chunk_size=1000, chunk_overlap=200)
    chunks = []
    
    for page_data in pages:
        split_texts = splitter.split_text(page_data["text"])
        for chunk_text in split_texts:
            chunks.append({
                "text": chunk_text,
                "metadata": {"page": page_data["page"], "source": file.filename}
            })
            
    return chunks
