import math
from typing import List, Dict, Any
from ortools.constraint_solver import routing_enums_pb2, pywrapcp


def haversine_km(lat1, lon1, lat2, lon2) -> float:
    if None in (lat1, lon1, lat2, lon2):
        return 1.0  # fallback distance when coordinates are missing
    R = 6371.0
    p1, p2 = math.radians(lat1), math.radians(lat2)
    dphi = math.radians(lat2 - lat1)
    dlambda = math.radians(lon2 - lon1)
    a = math.sin(dphi / 2) ** 2 + math.cos(p1) * math.cos(p2) * math.sin(dlambda / 2) ** 2
    return R * 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))


def optimize_route(
    depot: Dict[str, Any],
    stops: List[Dict[str, Any]],
    vehicle_capacity_kg: float | None = None,
) -> Dict[str, Any]:
    """
    depot: {"latitude": .., "longitude": ..}
    stops: list of {"id": int, "latitude": .., "longitude": .., "weight_kg": float}
    Returns optimized stop order + total distance in km.
    """
    locations = [depot] + stops
    n = len(locations)

    # Build distance matrix (in meters, OR-Tools prefers integers)
    distance_matrix = [
        [int(haversine_km(
            locations[i].get("latitude"), locations[i].get("longitude"),
            locations[j].get("latitude"), locations[j].get("longitude"),
        ) * 1000) for j in range(n)]
        for i in range(n)
    ]

    manager = pywrapcp.RoutingIndexManager(n, 1, 0)  # 1 vehicle, depot = index 0
    routing = pywrapcp.RoutingModel(manager)

    def distance_callback(from_index, to_index):
        from_node = manager.IndexToNode(from_index)
        to_node = manager.IndexToNode(to_index)
        return distance_matrix[from_node][to_node]

    transit_callback_index = routing.RegisterTransitCallback(distance_callback)
    routing.SetArcCostEvaluatorOfAllVehicles(transit_callback_index)

    # Capacity constraint
    if vehicle_capacity_kg:
        demands = [0] + [int(s.get("weight_kg") or 0) for s in stops]

        def demand_callback(from_index):
            return demands[manager.IndexToNode(from_index)]

        demand_callback_index = routing.RegisterUnaryTransitCallback(demand_callback)
        routing.AddDimensionWithVehicleCapacity(
            demand_callback_index, 0, [int(vehicle_capacity_kg)], True, "Capacity"
        )

    search_parameters = pywrapcp.DefaultRoutingSearchParameters()
    search_parameters.first_solution_strategy = routing_enums_pb2.FirstSolutionStrategy.PATH_CHEAPEST_ARC
    search_parameters.local_search_metaheuristic = routing_enums_pb2.LocalSearchMetaheuristic.GUIDED_LOCAL_SEARCH
    search_parameters.time_limit.seconds = 5

    solution = routing.SolveWithParameters(search_parameters)

    if not solution:
        # Fallback: keep original order if solver fails (e.g. infeasible capacity)
        return {
            "ordered_stop_ids": [s["id"] for s in stops],
            "total_distance_km": round(sum(
                haversine_km(stops[i].get("latitude"), stops[i].get("longitude"),
                             stops[i + 1].get("latitude"), stops[i + 1].get("longitude"))
                for i in range(len(stops) - 1)
            ), 2),
            "feasible": False,
        }

    index = routing.Start(0)
    ordered_stop_ids = []
    total_distance_m = 0
    while not routing.IsEnd(index):
        node = manager.IndexToNode(index)
        if node != 0:  # skip depot
            ordered_stop_ids.append(stops[node - 1]["id"])
        next_index = solution.Value(routing.NextVar(index))
        total_distance_m += routing.GetArcCostForVehicle(index, next_index, 0)
        index = next_index

    return {
        "ordered_stop_ids": ordered_stop_ids,
        "total_distance_km": round(total_distance_m / 1000, 2),
        "feasible": True,
    }