// Use a complete scheduled trip for each line. Some GTFS shapes extend beyond
// that trip's operating termini (notably Kajang's former northern section).
export function buildNetworkShapes(feed, lines, stations) {
  const result = {};
  for (const line of lines.filter(line => line.type !== "ERL")) {
    const entries = stations.filter(station => station.line_id === line.id);
    const byCode = new Map(entries.map(station => [station.station_code, station]));
    const trips = feed.trips.filter(trip => trip.route_id === line.id && trip.shape_id);
    let shape;
    for (const trip of trips) {
      const stops = feed.stopTimes.filter(time => time.trip_id === trip.trip_id)
        .sort((a, b) => Number(a.stop_sequence) - Number(b.stop_sequence));
      const ordered = stops.map(time => byCode.get(time.stop_id));
      if (ordered.includes(undefined) || ordered.length !== entries.length || new Set(ordered).size !== entries.length) continue;
      const points = feed.shapes.filter(point => point.shape_id === trip.shape_id)
        .sort((a, b) => Number(a.shape_pt_sequence) - Number(b.shape_pt_sequence))
        .map(point => [Number(point.shape_pt_lat), Number(point.shape_pt_lon)]);
      if (!points.length || points.some(([lat, lng]) => !(lat > 2.5 && lat < 3.5 && lng > 101 && lng < 102))) continue;
      const indices = ordered.map(station => {
        let nearest = -1;
        let bestDistance = Infinity;
        points.forEach(([lat, lng], index) => {
          const distance = Math.hypot(lat - station.lat, lng - station.lng);
          if (distance < bestDistance) {
            bestDistance = distance;
            nearest = index;
          }
        });
        // The current shapes have a vertex within 161 m of each stop. Reject
        // unrelated geometry when an upstream shape or trip ID changes.
        return bestDistance < 0.003 ? nearest : -1;
      });
      if (indices.some((index, i) => index < 0 || (i > 0 && index <= indices[i - 1]))) continue;
      shape = {
        tripId: trip.trip_id, shapeId: trip.shape_id, stopCodes: ordered.map(station => station.station_code),
        path: points.slice(indices[0], indices.at(-1) + 1)
      };
      break;
    }
    if (!shape) throw new Error(`No complete ordered GTFS shape for ${line.name}`);
    result[line.id] = shape;
  }
  return result;
}
