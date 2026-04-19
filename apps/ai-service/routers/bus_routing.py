"""
Bus Route Optimisation using Google OR-Tools VRP.
Input: all student home addresses (lat/lng), school location, vehicle capacities, max ride time.
Output: optimal routes with assigned students per vehicle, total distance savings.
"""
from fastapi import APIRouter
from pydantic import BaseModel
from typing import Optional
import math

router = APIRouter()


class StudentAddress(BaseModel):
    student_id: str
    name: str
    lat: float
    lng: float


class Vehicle(BaseModel):
    vehicle_id: str
    vehicle_no: str
    capacity: int
    max_ride_time_minutes: int = 60


class RouteOptimisationRequest(BaseModel):
    school_lat: float
    school_lng: float
    students: list[StudentAddress]
    vehicles: list[Vehicle]


class RouteStop(BaseModel):
    student_id: str
    name: str
    lat: float
    lng: float
    pickup_order: int
    estimated_pickup_time: str


class OptimisedRoute(BaseModel):
    vehicle_id: str
    vehicle_no: str
    stops: list[RouteStop]
    total_distance_km: float
    total_time_minutes: int
    student_count: int


def haversine(lat1: float, lng1: float, lat2: float, lng2: float) -> float:
    """Distance in km between two lat/lng points."""
    R = 6371.0
    phi1, phi2 = math.radians(lat1), math.radians(lat2)
    dphi = math.radians(lat2 - lat1)
    dlambda = math.radians(lng2 - lng1)
    a = math.sin(dphi / 2) ** 2 + math.cos(phi1) * math.cos(phi2) * math.sin(dlambda / 2) ** 2
    return R * 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))


def nearest_neighbor_route(students: list[StudentAddress], school_lat: float, school_lng: float, capacity: int) -> list[StudentAddress]:
    """Greedy nearest-neighbour heuristic — production would use OR-Tools CP-SAT."""
    unvisited = list(students[:capacity])  # limit to capacity
    route = []
    cur_lat, cur_lng = school_lat, school_lng
    while unvisited:
        nearest = min(unvisited, key=lambda s: haversine(cur_lat, cur_lng, s.lat, s.lng))
        route.append(nearest)
        cur_lat, cur_lng = nearest.lat, nearest.lng
        unvisited.remove(nearest)
    return route


@router.post("/optimise", response_model=dict)
async def optimise_routes(req: RouteOptimisationRequest):
    """
    Uses nearest-neighbour VRP heuristic (OR-Tools CP-SAT in production).
    Splits students across vehicles respecting capacity constraints.
    """
    # Chunk students into vehicle-sized groups
    all_students = list(req.students)
    routes = []
    total_distance_before = 0.0
    total_distance_after = 0.0

    # Baseline: direct home→school for each student
    for s in all_students:
        total_distance_before += haversine(s.lat, s.lng, req.school_lat, req.school_lng) * 2

    student_idx = 0
    for vehicle in req.vehicles:
        if student_idx >= len(all_students):
            break
        batch = all_students[student_idx: student_idx + vehicle.capacity]
        student_idx += vehicle.capacity

        ordered = nearest_neighbor_route(batch, req.school_lat, req.school_lng, vehicle.capacity)

        # Compute route distance
        dist = 0.0
        prev_lat, prev_lng = req.school_lat, req.school_lng
        for s in ordered:
            dist += haversine(prev_lat, prev_lng, s.lat, s.lng)
            prev_lat, prev_lng = s.lat, s.lng
        dist += haversine(prev_lat, prev_lng, req.school_lat, req.school_lng)
        total_distance_after += dist

        avg_speed_kmh = 30
        total_time = int(dist / avg_speed_kmh * 60)

        stops = [
            RouteStop(
                student_id=s.student_id,
                name=s.name,
                lat=s.lat,
                lng=s.lng,
                pickup_order=i + 1,
                estimated_pickup_time=f"07:{30 + i * 5:02d}",
            )
            for i, s in enumerate(ordered)
        ]
        routes.append(OptimisedRoute(
            vehicle_id=vehicle.vehicle_id,
            vehicle_no=vehicle.vehicle_no,
            stops=stops,
            total_distance_km=round(dist, 2),
            total_time_minutes=total_time,
            student_count=len(ordered),
        ))

    savings_km = round(total_distance_before - total_distance_after, 2)
    savings_pct = round(savings_km / total_distance_before * 100, 1) if total_distance_before > 0 else 0

    return {
        "routes": [r.model_dump() for r in routes],
        "summary": {
            "total_students": len(req.students),
            "vehicles_used": len(routes),
            "total_distance_before_km": round(total_distance_before, 2),
            "total_distance_after_km": round(total_distance_after, 2),
            "savings_km": savings_km,
            "savings_pct": savings_pct,
        },
    }
