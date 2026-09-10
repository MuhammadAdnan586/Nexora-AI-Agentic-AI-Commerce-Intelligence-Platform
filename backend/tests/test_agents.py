from unittest.mock import patch
from langchain_core.messages import AIMessage, HumanMessage
from app.agents.graph import supervisor_router, ACTION_KEYWORDS


def _state(text):
    return {"messages": [HumanMessage(content=text)]}


def test_action_keyword_routes_without_calling_llm():
    state = _state('please assign warehouse to order 5')
    with patch('app.agents.graph.safe_llm_invoke') as mock_invoke:
        result = supervisor_router(state)
    assert result == 'actions'
    mock_invoke.assert_not_called()


def test_all_action_keywords_route_to_actions():
    for keyword in ACTION_KEYWORDS:
        state = _state(f'please {keyword} now')
        with patch('app.agents.graph.safe_llm_invoke') as mock_invoke:
            result = supervisor_router(state)
        assert result == 'actions', f'keyword not routed: {keyword}'
        mock_invoke.assert_not_called()


@patch('app.agents.graph.safe_llm_invoke')
def test_llm_routes_to_inventory(mock_invoke):
    mock_invoke.return_value = AIMessage(content='inventory')
    result = supervisor_router(_state('what is the price of product X?'))
    assert result == 'inventory'


@patch('app.agents.graph.safe_llm_invoke')
def test_llm_routes_to_order(mock_invoke):
    mock_invoke.return_value = AIMessage(content='order')
    result = supervisor_router(_state('where is my order?'))
    assert result == 'order'


@patch('app.agents.graph.safe_llm_invoke')
def test_llm_routes_to_weather(mock_invoke):
    mock_invoke.return_value = AIMessage(content='weather')
    weather_query = 'what is the weather like today'
    result = supervisor_router(_state(weather_query))
    assert result == 'weather'


@patch('app.agents.graph.safe_llm_invoke')
def test_llm_routes_to_intelligence(mock_invoke):
    mock_invoke.return_value = AIMessage(content='intelligence')
    result = supervisor_router(_state('which products should we promote?'))
    assert result == 'intelligence'


@patch('app.agents.graph.safe_llm_invoke')
def test_llm_routes_to_pricing(mock_invoke):
    mock_invoke.return_value = AIMessage(content='pricing')
    result = supervisor_router(_state('what price cuts do you recommend for this item'))
    assert result == 'pricing'


@patch('app.agents.graph.safe_llm_invoke')
def test_llm_routes_to_risk(mock_invoke):
    mock_invoke.return_value = AIMessage(content='risk')
    result = supervisor_router(_state('check this order for fraud'))
    assert result == 'risk'


@patch('app.agents.graph.safe_llm_invoke')
def test_llm_routes_confirm_reply_to_actions(mock_invoke):
    mock_invoke.return_value = AIMessage(content='actions')
    result = supervisor_router(_state('yes'))
    assert result == 'actions'


@patch('app.agents.graph.safe_llm_invoke')
def test_llm_unknown_decision_falls_back_to_support(mock_invoke):
    mock_invoke.return_value = AIMessage(content='some_random_unrecognized_word')
    result = supervisor_router(_state('hello there'))
    assert result == 'support'


@patch('app.agents.graph.safe_llm_invoke')
def test_llm_decision_is_case_insensitive(mock_invoke):
    mock_invoke.return_value = AIMessage(content='INVENTORY')
    result = supervisor_router(_state('stock levels?'))
    assert result == 'inventory'

