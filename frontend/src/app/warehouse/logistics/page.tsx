"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, X, ArrowLeft } from "lucide-react";
import { warehouseApi } from "@/lib/warehouseApi";

interface Vehicle {
  id: number;
  plate_number: string;
  type: string;
  capacity_kg: number | null;
  status: string;
}

interface Driver {
  id: number;
  name: string;
  phone: string | null;
  license_number: string | null;
  vehicle_id: number | null;
  status: string;
}

interface RouteItem {
  id: number;
  driver_id: number | null;
  vehicle_id: number | null;
  route_date: string | null;
  status: string;
  total_distance_km: number | null;
  total_stops: number;
}

interface Delivery {
  id: number;
  order_id: number;
  route_id: number | null;
  driver_id: number | null;
  status: string;
  delivery_address: string | null;
  scheduled_date: string | null;
  delivered_at: string | null;
}
interface Stop {
  id: number;
  order_id: number | null;
  sequence: number;
  address: string | null;
  latitude: number | null;
  longitude: number | null;
  stop_type: string;
  status: string;
}

interface DeliverableOrder {
  id: number;
  status: string;
  shipping_address: string | null;
  total_amount: number;
}

type Tab = "vehicles" | "drivers" | "routes" | "deliveries";

const statusColor = (status: string) => {
  const ok = ["available", "delivered", "completed", "in_use", "in_progress"];
  const warn = ["assigned", "in_transit", "on_route", "planned", "pending"];
  if (ok.includes(status)) return "bg-nexora-success/10 text-nexora-success";
  if (warn.includes(status)) return "bg-nexora-primary/10 text-nexora-primary";
  return "bg-nexora-danger/10 text-nexora-danger";
};

export default function WarehouseLogisticsPage() {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>("vehicles");
  const [loading, setLoading] = useState(true);

  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [routes, setRoutes] = useState<RouteItem[]>([]);
  const [deliveries, setDeliveries] = useState<Delivery[]>([]);
  const [deliverableOrders, setDeliverableOrders] = useState<DeliverableOrder[]>([]);
  const [showForm, setShowForm] = useState(false);
  
  const [expandedRouteId, setExpandedRouteId] = useState<number | null>(null);
  const [stops, setStops] = useState<Stop[]>([]);
  const [stopsLoading, setStopsLoading] = useState(false);
  const [showStopForm, setShowStopForm] = useState(false);
  const [optimizing, setOptimizing] = useState(false);
  const [optimizeResult, setOptimizeResult] = useState<{ total_distance_km: number; feasible: boolean } | null>(null);
  const [stopForm, setStopForm] = useState({ address: "", latitude: "", longitude: "", stop_type: "delivery" });
  const [vehicleForm, setVehicleForm] = useState({ plate_number: "", type: "van", capacity_kg: "" });
  const [driverForm, setDriverForm] = useState({ name: "", phone: "", license_number: "", vehicle_id: "" });
  const [routeForm, setRouteForm] = useState({ driver_id: "", vehicle_id: "", route_date: "" });
  const [deliveryForm, setDeliveryForm] = useState({ order_id: "", delivery_address: "", scheduled_date: "" });
  const [editingVehicle, setEditingVehicle] = useState<Vehicle | null>(null);
  const [editingDriver, setEditingDriver] = useState<Driver | null>(null);
  const [editVehicleForm, setEditVehicleForm] = useState({ plate_number: "", type: "van", capacity_kg: "", status: "available" });
  const [editDriverForm, setEditDriverForm] = useState({ name: "", phone: "", license_number: "", vehicle_id: "", status: "available" });
  const loadData = async () => {
    setLoading(true);
    try {
      const [vRes, dRes, rRes, delRes, ordRes] = await Promise.all([
        warehouseApi.get("/warehouse-portal/vehicles"),
        warehouseApi.get("/warehouse-portal/drivers"),
        warehouseApi.get("/warehouse-portal/routes"),
        warehouseApi.get("/warehouse-portal/deliveries"),
        warehouseApi.get("/warehouse-portal/orders/deliverable"),
      ]);
      setVehicles(vRes.data);
      setDrivers(dRes.data);
      setRoutes(rRes.data);
      setDeliveries(delRes.data);
      setDeliverableOrders(ordRes.data);
    } catch {
      router.push("/warehouse/login");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleVehicleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await warehouseApi.post("/warehouse-portal/vehicles", {
      plate_number: vehicleForm.plate_number,
      type: vehicleForm.type,
      capacity_kg: vehicleForm.capacity_kg ? parseFloat(vehicleForm.capacity_kg) : null,
    });
    setVehicleForm({ plate_number: "", type: "van", capacity_kg: "" });
    setShowForm(false);
    loadData();
  };

  const handleDriverSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await warehouseApi.post("/warehouse-portal/drivers", {
      name: driverForm.name,
      phone: driverForm.phone || null,
      license_number: driverForm.license_number || null,
      vehicle_id: driverForm.vehicle_id ? parseInt(driverForm.vehicle_id) : null,
    });
    setDriverForm({ name: "", phone: "", license_number: "", vehicle_id: "" });
    setShowForm(false);
    loadData();
  };

  const handleRouteSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await warehouseApi.post("/warehouse-portal/routes", {
      driver_id: routeForm.driver_id ? parseInt(routeForm.driver_id) : null,
      vehicle_id: routeForm.vehicle_id ? parseInt(routeForm.vehicle_id) : null,
      route_date: routeForm.route_date || null,
    });
    setRouteForm({ driver_id: "", vehicle_id: "", route_date: "" });
    setShowForm(false);
    loadData();
  };

  const handleDeliverySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await warehouseApi.post("/warehouse-portal/deliveries", {
      order_id: parseInt(deliveryForm.order_id),
      delivery_address: deliveryForm.delivery_address || null,
      scheduled_date: deliveryForm.scheduled_date || null,
    });
    setDeliveryForm({ order_id: "", delivery_address: "", scheduled_date: "" });
    setShowForm(false);
    loadData();
  };

  const updateDeliveryStatus = async (id: number, status: string) => {
    await warehouseApi.patch(`/warehouse-portal/deliveries/${id}/status`, { status });
    loadData();
  };

  const updateRouteStatus = async (id: number, status: string) => {
    await warehouseApi.put(`/warehouse-portal/routes/${id}/status`, { status });
    loadData();
  };
  const loadStops = async (routeId: number) => {
    setStopsLoading(true);
    setOptimizeResult(null);
    try {
      const res = await warehouseApi.get(`/warehouse-portal/routes/${routeId}/stops`);
      setStops(res.data);
    } finally {
      setStopsLoading(false);
    }
  };
    const openEditVehicle = (v: Vehicle) => {
    setEditingVehicle(v);
    setEditVehicleForm({
      plate_number: v.plate_number,
      type: v.type,
      capacity_kg: v.capacity_kg?.toString() || "",
      status: v.status,
    });
  };

  const handleEditVehicleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingVehicle) return;
    await warehouseApi.put(`/warehouse-portal/vehicles/${editingVehicle.id}`, {
      plate_number: editVehicleForm.plate_number,
      type: editVehicleForm.type,
      capacity_kg: editVehicleForm.capacity_kg ? parseFloat(editVehicleForm.capacity_kg) : null,
      status: editVehicleForm.status,
    });
    setEditingVehicle(null);
    loadData();
  };

  const deleteVehicle = async (id: number) => {
    if (!confirm("Delete this vehicle?")) return;
    try {
      await warehouseApi.delete(`/warehouse-portal/vehicles/${id}`);
      loadData();
    } catch (err: any) {
      alert(err?.response?.data?.detail || "Could not delete vehicle");
    }
  };

  const openEditDriver = (d: Driver) => {
    setEditingDriver(d);
    setEditDriverForm({
      name: d.name,
      phone: d.phone || "",
      license_number: d.license_number || "",
      vehicle_id: d.vehicle_id?.toString() || "",
      status: d.status,
    });
  };

  const handleEditDriverSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingDriver) return;
    await warehouseApi.put(`/warehouse-portal/drivers/${editingDriver.id}`, {
      name: editDriverForm.name,
      phone: editDriverForm.phone || null,
      license_number: editDriverForm.license_number || null,
      vehicle_id: editDriverForm.vehicle_id ? parseInt(editDriverForm.vehicle_id) : null,
      status: editDriverForm.status,
    });
    setEditingDriver(null);
    loadData();
  };

  const deleteDriver = async (id: number) => {
    if (!confirm("Delete this driver?")) return;
    try {
      await warehouseApi.delete(`/warehouse-portal/drivers/${id}`);
      loadData();
    } catch (err: any) {
      alert(err?.response?.data?.detail || "Could not delete driver");
    }
  };
  const toggleRoute = (routeId: number) => {
    if (expandedRouteId === routeId) {
      setExpandedRouteId(null);
      setStops([]);
    } else {
      setExpandedRouteId(routeId);
      loadStops(routeId);
    }
  };

  const handleStopSubmit = async (e: React.FormEvent, routeId: number) => {
    e.preventDefault();
    await warehouseApi.post(`/warehouse-portal/routes/${routeId}/stops`, {
      address: stopForm.address || null,
      latitude: stopForm.latitude ? parseFloat(stopForm.latitude) : null,
      longitude: stopForm.longitude ? parseFloat(stopForm.longitude) : null,
      stop_type: stopForm.stop_type,
      sequence: stops.length,
    });
    setStopForm({ address: "", latitude: "", longitude: "", stop_type: "delivery" });
    setShowStopForm(false);
    loadStops(routeId);
    loadData();
  };

  const handleOptimize = async (routeId: number) => {
    setOptimizing(true);
    setOptimizeResult(null);
    try {
      const res = await warehouseApi.post(`/warehouse-portal/routes/${routeId}/optimize`);
      setOptimizeResult({ total_distance_km: res.data.total_distance_km, feasible: res.data.feasible });
      loadStops(routeId);
      loadData();
    } catch {
      setOptimizeResult(null);
    } finally {
      setOptimizing(false);
    }
  };
  const inputClass =
    "bg-nexora-bg border border-nexora-border rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-nexora-primary";

  const tabs: { key: Tab; label: string }[] = [
    { key: "vehicles", label: "Vehicles" },
    { key: "drivers", label: "Drivers" },
    { key: "routes", label: "Routes" },
    { key: "deliveries", label: "Deliveries" },
  ];

  return (
    <div className="min-h-screen bg-nexora-bg text-nexora-text p-6">
      <button
        onClick={() => router.push("/warehouse/dashboard")}
        className="flex items-center gap-2 text-sm text-nexora-muted hover:text-nexora-text mb-6"
      >
        <ArrowLeft size={16} />
        Back to dashboard
      </button>

      <div className="flex items-center justify-between mb-6">
        <h1 className="font-display text-2xl font-bold">Logistics</h1>
        <button
          onClick={() => setShowForm(true)}
          className="flex items-center gap-2 bg-nexora-primary text-white px-4 py-2.5 rounded-xl text-sm font-medium hover:bg-nexora-primary/90 transition-colors"
        >
          <Plus size={16} />
          {tab === "vehicles" && "Add Vehicle"}
          {tab === "drivers" && "Add Driver"}
          {tab === "routes" && "Create Route"}
          {tab === "deliveries" && "Create Delivery"}
        </button>
      </div>

      <div className="flex gap-1 mb-6 border-b border-nexora-border">
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => {
              setTab(t.key);
              setShowForm(false);
            }}
            className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
              tab === t.key
                ? "border-nexora-primary text-nexora-primary"
                : "border-transparent text-nexora-muted hover:text-nexora-text"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {showForm && tab === "vehicles" && (
        <div className="bg-nexora-surface border border-nexora-border rounded-2xl p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-display font-bold">New Vehicle</h2>
            <button onClick={() => setShowForm(false)} className="text-nexora-muted hover:text-nexora-text">
              <X size={18} />
            </button>
          </div>
          <form onSubmit={handleVehicleSubmit} className="grid sm:grid-cols-2 gap-4">
            <input
              required
              placeholder="Plate number"
              value={vehicleForm.plate_number}
              onChange={(e) => setVehicleForm({ ...vehicleForm, plate_number: e.target.value })}
              className={inputClass}
            />
            <select
              value={vehicleForm.type}
              onChange={(e) => setVehicleForm({ ...vehicleForm, type: e.target.value })}
              className={inputClass}
            >
              <option value="bike">Bike</option>
              <option value="van">Van</option>
              <option value="truck">Truck</option>
            </select>
            <input
              type="number"
              placeholder="Capacity (kg)"
              value={vehicleForm.capacity_kg}
              onChange={(e) => setVehicleForm({ ...vehicleForm, capacity_kg: e.target.value })}
              className={inputClass}
            />
            <button type="submit" className="sm:col-span-2 bg-nexora-primary text-white py-2.5 rounded-xl text-sm font-medium">
              Create Vehicle
            </button>
          </form>
        </div>
      )}

      {showForm && tab === "drivers" && (
        <div className="bg-nexora-surface border border-nexora-border rounded-2xl p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-display font-bold">New Driver</h2>
            <button onClick={() => setShowForm(false)} className="text-nexora-muted hover:text-nexora-text">
              <X size={18} />
            </button>
          </div>
          <form onSubmit={handleDriverSubmit} className="grid sm:grid-cols-2 gap-4">
            <input
              required
              placeholder="Full name"
              value={driverForm.name}
              onChange={(e) => setDriverForm({ ...driverForm, name: e.target.value })}
              className={inputClass}
            />
            <input
              placeholder="Phone"
              value={driverForm.phone}
              onChange={(e) => setDriverForm({ ...driverForm, phone: e.target.value })}
              className={inputClass}
            />
            <input
              placeholder="License number"
              value={driverForm.license_number}
              onChange={(e) => setDriverForm({ ...driverForm, license_number: e.target.value })}
              className={inputClass}
            />
            <select
              value={driverForm.vehicle_id}
              onChange={(e) => setDriverForm({ ...driverForm, vehicle_id: e.target.value })}
              className={inputClass}
            >
              <option value="">Assign vehicle</option>
              {vehicles.map((v) => <option key={v.id} value={v.id}>{v.plate_number}</option>)}
            </select>
            <button type="submit" className="sm:col-span-2 bg-nexora-primary text-white py-2.5 rounded-xl text-sm font-medium">
              Create Driver
            </button>
          </form>
        </div>
      )}

      {showForm && tab === "routes" && (
        <div className="bg-nexora-surface border border-nexora-border rounded-2xl p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-display font-bold">New Route</h2>
            <button onClick={() => setShowForm(false)} className="text-nexora-muted hover:text-nexora-text">
              <X size={18} />
            </button>
          </div>
          <form onSubmit={handleRouteSubmit} className="grid sm:grid-cols-2 gap-4">
            <select
              value={routeForm.driver_id}
              onChange={(e) => setRouteForm({ ...routeForm, driver_id: e.target.value })}
              className={inputClass}
            >
              <option value="">Select driver</option>
              {drivers.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
            </select>
            <select
              value={routeForm.vehicle_id}
              onChange={(e) => setRouteForm({ ...routeForm, vehicle_id: e.target.value })}
              className={inputClass}
            >
              <option value="">Select vehicle</option>
              {vehicles.map((v) => <option key={v.id} value={v.id}>{v.plate_number}</option>)}
            </select>
            <input
              type="date"
              value={routeForm.route_date}
              onChange={(e) => setRouteForm({ ...routeForm, route_date: e.target.value })}
              className={inputClass}
            />
            <button type="submit" className="sm:col-span-2 bg-nexora-primary text-white py-2.5 rounded-xl text-sm font-medium">
              Create Route
            </button>
          </form>
        </div>
      )}

      {showForm && tab === "deliveries" && (
        <div className="bg-nexora-surface border border-nexora-border rounded-2xl p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-display font-bold">New Delivery</h2>
            <button onClick={() => setShowForm(false)} className="text-nexora-muted hover:text-nexora-text">
              <X size={18} />
            </button>
          </div>
          <form onSubmit={handleDeliverySubmit} className="grid sm:grid-cols-2 gap-4">
            <select
              required
              value={deliveryForm.order_id}
              onChange={(e) => {
                const order = deliverableOrders.find((o) => o.id === parseInt(e.target.value));
                setDeliveryForm({
                  ...deliveryForm,
                  order_id: e.target.value,
                  delivery_address: order?.shipping_address || deliveryForm.delivery_address,
                });
              }}
              className={inputClass}
            >
              <option value="">Select order</option>
              {deliverableOrders.map((o) => (
                <option key={o.id} value={o.id}>
                  #{o.id} — {o.status} — {o.shipping_address || "no address"}
                </option>
              ))}
            </select>
            <input
              type="date"
              value={deliveryForm.scheduled_date}
              onChange={(e) => setDeliveryForm({ ...deliveryForm, scheduled_date: e.target.value })}
              className={inputClass}
            />
            <input
              placeholder="Delivery address"
              value={deliveryForm.delivery_address}
              onChange={(e) => setDeliveryForm({ ...deliveryForm, delivery_address: e.target.value })}
              className={`sm:col-span-2 ${inputClass}`}
            />
            <button type="submit" className="sm:col-span-2 bg-nexora-primary text-white py-2.5 rounded-xl text-sm font-medium">
              Create Delivery
            </button>
          </form>
        </div>
      )}

      <div className="bg-nexora-surface border border-nexora-border rounded-2xl overflow-hidden">
        {loading ? (
          <div className="px-5 py-8 text-center text-nexora-muted text-sm">Loading...</div>
        ) : tab === "vehicles" ? (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-nexora-border text-nexora-muted text-left">
                <th className="px-5 py-3 font-medium">Plate</th>
                <th className="px-5 py-3 font-medium">Type</th>
                <th className="px-5 py-3 font-medium">Capacity (kg)</th>
                <th className="px-5 py-3 font-medium">Status</th>
                <th className="px-5 py-3 font-medium"></th>
              </tr>
            </thead>
            <tbody>
              {vehicles.length === 0 ? (
                <tr><td colSpan={5} className="px-5 py-8 text-center text-nexora-muted">No vehicles yet.</td></tr>
              ) : (
                vehicles.map((v) => (
                  <tr key={v.id} className="border-b border-nexora-border last:border-0">
                    <td className="px-5 py-3 font-medium">{v.plate_number}</td>
                    <td className="px-5 py-3 capitalize">{v.type}</td>
                    <td className="px-5 py-3 text-nexora-muted">{v.capacity_kg ?? "—"}</td>
                    <td className="px-5 py-3">
                      <span className={`text-xs px-2 py-1 rounded-full ${statusColor(v.status)}`}>{v.status}</span>
                    </td>
                    <td className="px-5 py-3 text-right">
                      <button onClick={() => openEditVehicle(v)} className="text-xs text-nexora-primary hover:underline mr-3">Edit</button>
                      <button onClick={() => deleteVehicle(v.id)} className="text-xs text-nexora-danger hover:underline">Delete</button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        ) : tab === "drivers" ? (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-nexora-border text-nexora-muted text-left">
                <th className="px-5 py-3 font-medium">Name</th>
                <th className="px-5 py-3 font-medium">Phone</th>
                <th className="px-5 py-3 font-medium">Vehicle</th>
                <th className="px-5 py-3 font-medium">Status</th>
                <th className="px-5 py-3 font-medium"></th>
              </tr>
            </thead>
            <tbody>
              {drivers.length === 0 ? (
                <tr><td colSpan={5} className="px-5 py-8 text-center text-nexora-muted">No drivers yet.</td></tr>
              ) : (
                drivers.map((d) => (
                  <tr key={d.id} className="border-b border-nexora-border last:border-0">
                    <td className="px-5 py-3 font-medium">{d.name}</td>
                    <td className="px-5 py-3 text-nexora-muted">{d.phone ?? "—"}</td>
                    <td className="px-5 py-3 text-nexora-muted">
                      {vehicles.find((v) => v.id === d.vehicle_id)?.plate_number ?? "—"}
                    </td>
                    <td className="px-5 py-3">
                      <span className={`text-xs px-2 py-1 rounded-full ${statusColor(d.status)}`}>{d.status}</span>
                    </td>
                    <td className="px-5 py-3 text-right">
                      <button onClick={() => openEditDriver(d)} className="text-xs text-nexora-primary hover:underline mr-3">Edit</button>
                      <button onClick={() => deleteDriver(d.id)} className="text-xs text-nexora-danger hover:underline">Delete</button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        ) : tab === "routes" ? (
          <div>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-nexora-border text-nexora-muted text-left">
                  <th className="px-5 py-3 font-medium">Route ID</th>
                  <th className="px-5 py-3 font-medium">Driver</th>
                  <th className="px-5 py-3 font-medium">Vehicle</th>
                  <th className="px-5 py-3 font-medium">Stops</th>
                  <th className="px-5 py-3 font-medium">Distance (km)</th>
                  <th className="px-5 py-3 font-medium">Status</th>
                  <th className="px-5 py-3 font-medium"></th>
                </tr>
              </thead>
              <tbody>
                {routes.length === 0 ? (
                  <tr><td colSpan={7} className="px-5 py-8 text-center text-nexora-muted">No routes yet.</td></tr>
                ) : (
                  routes.map((r) => (
                    <tr key={r.id} className="border-b border-nexora-border last:border-0">
                      <td className="px-5 py-3 font-medium">#{r.id}</td>
                      <td className="px-5 py-3 text-nexora-muted">
                        {drivers.find((d) => d.id === r.driver_id)?.name ?? "—"}
                      </td>
                      <td className="px-5 py-3 text-nexora-muted">
                        {vehicles.find((v) => v.id === r.vehicle_id)?.plate_number ?? "—"}
                      </td>
                      <td className="px-5 py-3 text-nexora-muted">{r.total_stops}</td>
                      <td className="px-5 py-3 text-nexora-muted">{r.total_distance_km ?? "—"}</td>
                      <td className="px-5 py-3">
                        <select
                          value={r.status}
                          onChange={(e) => updateRouteStatus(r.id, e.target.value)}
                          className={`text-xs px-2 py-1 rounded-full border-0 ${statusColor(r.status)}`}
                        >
                          <option value="planned">planned</option>
                          <option value="in_progress">in_progress</option>
                          <option value="completed">completed</option>
                          <option value="cancelled">cancelled</option>
                        </select>
                      </td>
                      <td className="px-5 py-3">
                        <button
                          onClick={() => toggleRoute(r.id)}
                          className="text-xs text-nexora-primary hover:underline font-medium"
                        >
                          {expandedRouteId === r.id ? "Hide stops" : "View stops"}
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>

            {expandedRouteId !== null && (
              <div className="border-t border-nexora-border p-5">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-display font-bold text-sm">Stops for Route #{expandedRouteId}</h3>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setShowStopForm(true)}
                      className="text-xs border border-nexora-border px-3 py-1.5 rounded-lg text-nexora-muted hover:text-nexora-text"
                    >
                      + Add Stop
                    </button>
                    <button
                      onClick={() => handleOptimize(expandedRouteId)}
                      disabled={optimizing || stops.length < 2}
                      className="text-xs bg-nexora-primary text-white px-3 py-1.5 rounded-lg font-medium disabled:opacity-50"
                    >
                      {optimizing ? "Optimizing..." : "Optimize Route"}
                    </button>
                  </div>
                </div>

                {optimizeResult && (
                  <div className={`text-xs mb-4 px-3 py-2 rounded-lg ${optimizeResult.feasible ? "bg-nexora-success/10 text-nexora-success" : "bg-nexora-danger/10 text-nexora-danger"}`}>
                    {optimizeResult.feasible
                      ? `Optimized! Total distance: ${optimizeResult.total_distance_km} km`
                      : `Could not fully optimize (capacity constraints) — used fallback order. Distance: ${optimizeResult.total_distance_km} km`}
                  </div>
                )}

                {showStopForm && (
                  <form
                    onSubmit={(e) => handleStopSubmit(e, expandedRouteId)}
                    className="grid sm:grid-cols-4 gap-3 mb-4 bg-nexora-bg border border-nexora-border rounded-xl p-4"
                  >
                    <input
                      placeholder="Address"
                      value={stopForm.address}
                      onChange={(e) => setStopForm({ ...stopForm, address: e.target.value })}
                      className={inputClass}
                    />
                    <input
                      placeholder="Latitude"
                      type="number"
                      step="any"
                      value={stopForm.latitude}
                      onChange={(e) => setStopForm({ ...stopForm, latitude: e.target.value })}
                      className={inputClass}
                    />
                    <input
                      placeholder="Longitude"
                      type="number"
                      step="any"
                      value={stopForm.longitude}
                      onChange={(e) => setStopForm({ ...stopForm, longitude: e.target.value })}
                      className={inputClass}
                    />
                    <button type="submit" className="bg-nexora-primary text-white rounded-xl text-sm font-medium">
                      Add
                    </button>
                  </form>
                )}

                {stopsLoading ? (
                  <div className="text-center text-nexora-muted text-sm py-4">Loading stops...</div>
                ) : stops.length === 0 ? (
                  <div className="text-center text-nexora-muted text-sm py-4">No stops added yet.</div>
                ) : (
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-nexora-muted text-left">
                        <th className="py-2 font-medium">Seq</th>
                        <th className="py-2 font-medium">Address</th>
                        <th className="py-2 font-medium">Lat/Lng</th>
                        <th className="py-2 font-medium">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {stops
                        .slice()
                        .sort((a, b) => a.sequence - b.sequence)
                        .map((s) => (
                          <tr key={s.id} className="border-t border-nexora-border">
                            <td className="py-2 font-medium">{s.sequence}</td>
                            <td className="py-2 text-nexora-muted">{s.address ?? "—"}</td>
                            <td className="py-2 text-nexora-muted">
                              {s.latitude && s.longitude ? `${s.latitude}, ${s.longitude}` : "—"}
                            </td>
                            <td className="py-2">
                              <span className={`text-xs px-2 py-1 rounded-full ${statusColor(s.status)}`}>{s.status}</span>
                            </td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                )}
              </div>
            )}
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-nexora-border text-nexora-muted text-left">
                <th className="px-5 py-3 font-medium">Order</th>
                <th className="px-5 py-3 font-medium">Address</th>
                <th className="px-5 py-3 font-medium">Scheduled</th>
                <th className="px-5 py-3 font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {deliveries.length === 0 ? (
                <tr><td colSpan={4} className="px-5 py-8 text-center text-nexora-muted">No deliveries yet.</td></tr>
              ) : (
                deliveries.map((del) => (
                  <tr key={del.id} className="border-b border-nexora-border last:border-0">
                    <td className="px-5 py-3 font-medium">#{del.order_id}</td>
                    <td className="px-5 py-3 text-nexora-muted">{del.delivery_address ?? "—"}</td>
                    <td className="px-5 py-3 text-nexora-muted">
                      {del.scheduled_date ? new Date(del.scheduled_date).toLocaleDateString() : "—"}
                    </td>
                    <td className="px-5 py-3">
                      <select
                        value={del.status}
                        onChange={(e) => updateDeliveryStatus(del.id, e.target.value)}
                        className={`text-xs px-2 py-1 rounded-full border-0 ${statusColor(del.status)}`}
                      >
                        <option value="pending">pending</option>
                        <option value="assigned">assigned</option>
                        <option value="in_transit">in_transit</option>
                        <option value="delivered">delivered</option>
                        <option value="failed">failed</option>
                        <option value="returned">returned</option>
                      </select>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        )}
      </div>

      {editingVehicle && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center px-6 z-50" onClick={() => setEditingVehicle(null)}>
          <div className="bg-nexora-surface border border-nexora-border rounded-2xl p-6 max-w-md w-full" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-display font-bold">Edit Vehicle</h2>
              <button onClick={() => setEditingVehicle(null)} className="text-nexora-muted hover:text-nexora-text"><X size={18} /></button>
            </div>
            <form onSubmit={handleEditVehicleSubmit} className="grid gap-4">
              <input
                required
                placeholder="Plate number"
                value={editVehicleForm.plate_number}
                onChange={(e) => setEditVehicleForm({ ...editVehicleForm, plate_number: e.target.value })}
                className={inputClass}
              />
              <select
                value={editVehicleForm.type}
                onChange={(e) => setEditVehicleForm({ ...editVehicleForm, type: e.target.value })}
                className={inputClass}
              >
                <option value="bike">Bike</option>
                <option value="van">Van</option>
                <option value="truck">Truck</option>
              </select>
              <input
                type="number"
                placeholder="Capacity (kg)"
                value={editVehicleForm.capacity_kg}
                onChange={(e) => setEditVehicleForm({ ...editVehicleForm, capacity_kg: e.target.value })}
                className={inputClass}
              />
              <select
                value={editVehicleForm.status}
                onChange={(e) => setEditVehicleForm({ ...editVehicleForm, status: e.target.value })}
                className={inputClass}
              >
                <option value="available">Available</option>
                <option value="in_use">In Use</option>
                <option value="maintenance">Maintenance</option>
              </select>
              <button type="submit" className="bg-nexora-primary text-white py-2.5 rounded-xl text-sm font-medium">
                Save Changes
              </button>
            </form>
          </div>
        </div>
      )}

      {editingDriver && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center px-6 z-50" onClick={() => setEditingDriver(null)}>
          <div className="bg-nexora-surface border border-nexora-border rounded-2xl p-6 max-w-md w-full" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-display font-bold">Edit Driver</h2>
              <button onClick={() => setEditingDriver(null)} className="text-nexora-muted hover:text-nexora-text"><X size={18} /></button>
            </div>
            <form onSubmit={handleEditDriverSubmit} className="grid gap-4">
              <input
                required
                placeholder="Full name"
                value={editDriverForm.name}
                onChange={(e) => setEditDriverForm({ ...editDriverForm, name: e.target.value })}
                className={inputClass}
              />
              <input
                placeholder="Phone"
                value={editDriverForm.phone}
                onChange={(e) => setEditDriverForm({ ...editDriverForm, phone: e.target.value })}
                className={inputClass}
              />
              <input
                placeholder="License number"
                value={editDriverForm.license_number}
                onChange={(e) => setEditDriverForm({ ...editDriverForm, license_number: e.target.value })}
                className={inputClass}
              />
              <select
                value={editDriverForm.vehicle_id}
                onChange={(e) => setEditDriverForm({ ...editDriverForm, vehicle_id: e.target.value })}
                className={inputClass}
              >
                <option value="">Assign vehicle</option>
                {vehicles.map((v) => <option key={v.id} value={v.id}>{v.plate_number}</option>)}
              </select>
              <select
                value={editDriverForm.status}
                onChange={(e) => setEditDriverForm({ ...editDriverForm, status: e.target.value })}
                className={inputClass}
              >
                <option value="available">Available</option>
                <option value="on_route">On Route</option>
                <option value="off_duty">Off Duty</option>
              </select>
              <button type="submit" className="bg-nexora-primary text-white py-2.5 rounded-xl text-sm font-medium">
                Save Changes
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
