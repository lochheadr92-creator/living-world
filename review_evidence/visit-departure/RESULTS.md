# Why the 30 welfare visits missed

In the three rules-259 day-96 replays, 16 visitors chose a destination already more than five tiles from the intended person. Ten other visits failed immediately with the visitor outdoors and the target indoors. Three targets moved out of range on the approach. In the last case Hugo III was already 12 tiles from the home Jonas chose, then went indoors 42 ticks into the visit. The table assigns that case to its recorded different-space failure. Several mechanisms can apply to one visit.

The planner used recent whereabouts for 19 launches, a remembered home for seven and older whereabouts for four. Five of the ten immediate indoor failures had the correct interior in the visitor’s own whereabouts record and the exact map coordinates. Isla II tried Vik II twice, Bram tried Cole II once, and Ulric tried Pavel twice. These five launches are candidates for a test of whether the visit planner can use remembered rooms to offer a reachable interaction or defer a repeat. The other five immediate failures lacked that room entry. Using live hidden positions to reject them would give visitors information they did not have.

The three moving targets were Sana twice and Tariq once. Their launch positions were within five tiles of the visitor’s eventual position, and their end positions were outside it. In Aspen, five people separately sought Mona II using whereabouts records aged 105–299 ticks. She was already 9.6–11.2 tiles from their chosen destinations. A short memory age alone cannot guarantee contact.

Each replay matched its prior day-97 world hash and passed conservation. The failure counts matched the earlier social-reach evidence in each settlement. Position comparisons use launch and failure snapshots. A home inference provides no evidence the person was previously home. The sample covers these failures on one day per world. A change in visit success, walking time or welfare requires a separate paired test.

See VISITS.md for the 30 cases and the three JSON files for the underlying records. Regenerate the table with node scripts/visit_departure_tables.mjs from the worktree root.
