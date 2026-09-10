from app.services.route_optimizer import haversine_km, optimize_route


def test_haversine_km_same_point_is_zero():
    distance = haversine_km(31.5, 74.3, 31.5, 74.3)
    assert distance == 0.0


def test_haversine_km_known_distance_lahore_to_karachi():
    # Lahore (31.5497, 74.3436) to Karachi (24.8607, 67.0011) is roughly 1200km
    distance = haversine_km(31.5497, 74.3436, 24.8607, 67.0011)
    assert 950 < distance < 1100


def test_haversine_km_missing_coordinates_returns_fallback():
    distance = haversine_km(None, None, 31.5, 74.3)
    assert distance == 1.0


def test_optimize_route_with_single_stop():
    depot = {'latitude': 31.5, 'longitude': 74.3}
    stops = [{'id': 1, 'latitude': 31.52, 'longitude': 74.32, 'weight_kg': 5}]
    result = optimize_route(depot, stops)
    assert result['feasible'] is True
    assert result['ordered_stop_ids'] == [1]
    assert result['total_distance_km'] >= 0


def test_optimize_route_visits_all_stops():
    depot = {'latitude': 31.5, 'longitude': 74.3}
    stops = [
        {'id': 1, 'latitude': 31.52, 'longitude': 74.32, 'weight_kg': 5},
        {'id': 2, 'latitude': 31.55, 'longitude': 74.35, 'weight_kg': 5},
        {'id': 3, 'latitude': 31.48, 'longitude': 74.28, 'weight_kg': 5},
    ]
    result = optimize_route(depot, stops)
    assert result['feasible'] is True
    assert set(result['ordered_stop_ids']) == {1, 2, 3}
    assert len(result['ordered_stop_ids']) == 3


def test_optimize_route_respects_capacity_constraint():
    depot = {'latitude': 31.5, 'longitude': 74.3}
    stops = [
        {'id': 1, 'latitude': 31.52, 'longitude': 74.32, 'weight_kg': 40},
        {'id': 2, 'latitude': 31.55, 'longitude': 74.35, 'weight_kg': 40},
    ]
    result = optimize_route(depot, stops, vehicle_capacity_kg=100)
    assert result['feasible'] is True
    assert set(result['ordered_stop_ids']) == {1, 2}


def test_optimize_route_infeasible_capacity_falls_back_gracefully():
    depot = {'latitude': 31.5, 'longitude': 74.3}
    stops = [
        {'id': 1, 'latitude': 31.52, 'longitude': 74.32, 'weight_kg': 200},
    ]
    result = optimize_route(depot, stops, vehicle_capacity_kg=50)
    assert 'ordered_stop_ids' in result
    assert 'total_distance_km' in result


def test_optimize_route_total_distance_is_non_negative():
    depot = {'latitude': 31.5, 'longitude': 74.3}
    stops = [
        {'id': 1, 'latitude': 31.52, 'longitude': 74.32, 'weight_kg': 5},
        {'id': 2, 'latitude': 31.60, 'longitude': 74.40, 'weight_kg': 5},
    ]
    result = optimize_route(depot, stops)
    assert result['total_distance_km'] >= 0


def test_optimize_route_missing_coordinates_still_returns_result():
    depot = {'latitude': None, 'longitude': None}
    stops = [
        {'id': 1, 'latitude': None, 'longitude': None, 'weight_kg': 5},
        {'id': 2, 'latitude': None, 'longitude': None, 'weight_kg': 5},
    ]
    result = optimize_route(depot, stops)
    assert result['feasible'] is True
    assert set(result['ordered_stop_ids']) == {1, 2}

