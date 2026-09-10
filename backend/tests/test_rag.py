from app.rag.retrieval import chunk_text, retrieve_relevant_chunks
from app.models.document import Document


def test_chunk_text_single_short_paragraph():
    chunks = chunk_text('This is a short policy statement.')
    assert len(chunks) == 1
    assert chunks[0] == 'This is a short policy statement.'


def test_chunk_text_splits_on_size_limit():
    long_para_1 = 'A' * 300
    long_para_2 = 'B' * 300
    text = f'{long_para_1}\n{long_para_2}'
    chunks = chunk_text(text, max_chars=500)
    assert len(chunks) == 2
    assert chunks[0] == long_para_1
    assert chunks[1] == long_para_2


def test_chunk_text_merges_short_paragraphs_under_limit():
    text = 'Short one.\nShort two.\nShort three.'
    chunks = chunk_text(text, max_chars=500)
    assert len(chunks) == 1
    assert 'Short one.' in chunks[0]
    assert 'Short three.' in chunks[0]


def test_chunk_text_empty_string_returns_original():
    chunks = chunk_text('')
    assert chunks == ['']


def _create_document(db_session, title, content, category='policy'):
    doc = Document(title=title, category=category, content=content)
    db_session.add(doc)
    db_session.commit()
    db_session.refresh(doc)
    return doc


def test_retrieve_with_no_documents_returns_empty(db_session):
    results = retrieve_relevant_chunks(db_session, 'return policy for damaged items')
    assert results == []


def test_retrieve_finds_relevant_document(db_session):
    _create_document(
        db_session, 'Return Policy',
        'Customers can return damaged items within 30 days for a full refund. Items must be unused.',
    )
    _create_document(
        db_session, 'Shipping Guide',
        'Standard shipping takes 3 to 5 business days depending on the warehouse location.',
    )

    results = retrieve_relevant_chunks(db_session, 'how do I return a damaged item')
    assert len(results) > 0
    assert results[0]['title'] == 'Return Policy'


def test_retrieve_results_are_ranked_by_relevance_descending(db_session):
    _create_document(db_session, 'Return Policy', 'Returns are accepted within 30 days for damaged items only.')
    _create_document(db_session, 'Warehouse Hours', 'Our warehouses operate from 9am to 6pm on weekdays.')

    results = retrieve_relevant_chunks(db_session, 'damaged item return')
    scores = [r['relevance_score'] for r in results]
    assert scores == sorted(scores, reverse=True)


def test_retrieve_respects_top_k_limit(db_session):
    for i in range(5):
        _create_document(db_session, f'Policy Doc {i}', f'This is policy document number {i} about returns and refunds.')

    results = retrieve_relevant_chunks(db_session, 'returns and refunds', top_k=2)
    assert len(results) <= 2


def test_retrieve_irrelevant_query_returns_low_or_no_results(db_session):
    _create_document(db_session, 'Return Policy', 'Customers can return damaged items within 30 days.')

    results = retrieve_relevant_chunks(db_session, 'quantum physics and astronomy')
    for r in results:
        assert r['relevance_score'] >= 0


def test_retrieve_result_includes_document_id_for_citation(db_session):
    doc = _create_document(db_session, 'Return Policy', 'Damaged items can be returned within 30 days for a refund.')

    results = retrieve_relevant_chunks(db_session, 'damaged item refund policy')
    assert results[0]['document_id'] == doc.id
