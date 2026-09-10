from sqlalchemy.orm import Session
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity
from app.models.document import Document


def chunk_text(text: str, max_chars: int = 500) -> list:
    """Split text into paragraph-based chunks, respecting a max size."""
    paragraphs = [p.strip() for p in text.split("\n") if p.strip()]
    chunks = []
    current = ""
    for para in paragraphs:
        if len(current) + len(para) <= max_chars:
            current += (" " if current else "") + para
        else:
            if current:
                chunks.append(current)
            current = para
    if current:
        chunks.append(current)
    return chunks or [text]


def retrieve_relevant_chunks(db: Session, query: str, top_k: int = 3) -> list:
    """Retrieve the most relevant document chunks for a query using TF-IDF similarity."""
    documents = db.query(Document).all()
    if not documents:
        return []

    all_chunks = []
    for doc in documents:
        for chunk in chunk_text(doc.content):
            all_chunks.append({"document_id": doc.id, "title": doc.title, "text": chunk})

    if not all_chunks:
        return []

    corpus = [c["text"] for c in all_chunks] + [query]
    vectorizer = TfidfVectorizer(stop_words="english")
    tfidf_matrix = vectorizer.fit_transform(corpus)

    query_vector = tfidf_matrix[-1]
    chunk_vectors = tfidf_matrix[:-1]
    similarities = cosine_similarity(query_vector, chunk_vectors).flatten()

    ranked_indices = similarities.argsort()[::-1][:top_k]
    results = []
    for idx in ranked_indices:
        if similarities[idx] > 0:
            results.append({
                "document_id": all_chunks[idx]["document_id"],
                "title": all_chunks[idx]["title"],
                "text": all_chunks[idx]["text"],
                "relevance_score": round(float(similarities[idx]), 3),
            })
    return results