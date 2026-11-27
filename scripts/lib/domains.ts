// The groups src/sim is divided into for the import graph and the state map: a hand-written grouping by file name (first match wins).
// It is a guess, listed in full so it can be corrected, and both scripts read it from here.
export const DOMAINS: [string, RegExp][] = [
  ['kernel', /^(types|constants|util|rng|keyed_draws|id_ranges|rulesversion|support_floor|rules|profiles|registry|probe|time_text|labels|naming|layout_words|historical_index|history|continuity_knowledge)$/],
  ['world loop and setup', /^(world|factory|worldgen|found_empty|founding_coop|layout_claims|seed_storage|events|causal_events|background|scenes|external)$/],
  ['environment and land', /^(environment|flood|flood_access|hydrology|groundwater|wells|geology|ecology|forestry|tree_regrowth|wild_seed|sources|water_access|water_search|stored_water|stored_water_access|hardship|winter_practice|winter_shelter|lean_years|light_pack|warmth_duty|swap_and_fire)$/],
  ['animals and hunting', /^(wildlife|wolf_fight|wolf_skin|hunting|carcass|carcass_supply|defence|wooden_spear|livestock|livestock_food|herd_value|hand_feeding|farm_species|passive_gear|gear_stock|fishing_rods)$/],
  ['farming and food', /^(farm.*|act_farm|farming|grain_kept|hungry_harvest|bread_feeds|brewing|grow_more|preservation|cellars|oven_load|meals|meal_leftovers|eat_in_hand|tableeating|nourishment|metabolism|food_help|household_supply|provision|plenty|deposit_plenty|bigger_reserve|offcuts)$/],
  ['body, life and family', /^(needs|illness|fever_sign|life|lifecycle|lifechanges|lived_life|childhood|childhood_rules|coming_of_age|birth_help|child_.*|parent_decides|settle_child|people|achievement|memory_retention|family_food|age.*)$/],
  ['perception and knowledge', /^(perception|knowledge|known_.*|seen_.*|visible_need|witness_sight|death_knowledge|meeting_knowledge|promise_knowledge|social_memory|remembered_need|news|empty_news|checked_accounts|teller_confidence|final_account|proposal_belief|heard_helpers|route_learning|source_learning|helper_learning|learning)$/],
  ['decisions and plans', /^(decision|decision_ledger|intent|options_.*|optutil|mood|kept_target|action_scope|proposals|stalled_ask|standing_up|errand_load|leave_heaviest|local_demand|local_giving|picked_up|ring_fallback|trip_kept|night_experience|night_wait|leisure|play|toys|daily_routines|three_ages|occupation|occupation_storage|techniques|skill_coaching|transmission|trade_switch|answer_cause)$/],
  ['activities', /^(activities|act_.*|finish_job|ready_step|suspended_endings|work_handover|workshop_errand|gather_.*|developed|development)$/],
  ['social life', /^(social|relations|grievance|reputation|company|company_scenes|companionship|courting|dance|dialogue|evening_fire|hearth|hearth_scenes|kin_scenes|together_scenes|song|speak_for|praise|welcome|reunion|mediation|misdeeds|meeting|argue_once|temperament|traditions|occasions|occasion_.*|crews|civic_.*|political_alignment|apprentice|market_contact|customers|trade|exchange_journeys|three_ages|marriage|request_cancellation|promise_.*|promised_supply|shared_offer|settlement_economy|closeness|vigil|grief_sit|responsibilities|resident_contact)$/],
  ['economy and production', /^(economy|production|recipes|facilities|workshop|batch_.*|project_.*|shared_.*|material_stock|textile_stock|tools|toolreg|tool_feasibility|carts|cart_priority|transport|delivery_place|own_stores|reserved_goods|pack_materials|open_workplaces|recovered_workshops|smithy_iron|bench_access|picked|communal_stock|taken_from|repair_duty|clothing|carry_more|site_supply)$/],
  ['buildings and housing', /^(buildings|habitation|shelter|home_.*|household_practices|households|hut_before_larder|construction_.*|builder_fetches|retire_lean_to|layout.*|personal_places|pile_access|inspect_home_plan|settlements|townships|township_extent|relocation|growth_room|arrival_.*|immigration|succession|estate|estate_release|grave_site)$/],
  ['care and welfare', /^(care_.*|welfare|relief|resident_care|handover_.*|known_welfare|food_help|journey.*|location_question|pathfinding|fetch_home)$/],
  ['inspection and diagnostics', /^(inspect.*|gather_diagnostics|gather_review|development|cohortcapture|shown|labels|decision_ledger)$/],
];

/** the group of a file, from its path relative to src (forward slashes): src/sim files by name, everything else by folder */
export function domainOfRel(rel: string): string {
  const top = rel.split('/')[0];
  if (top !== 'sim') return top === 'main.ts' ? 'app' : top;
  const base = rel.slice('sim/'.length).replace(/\.ts$/, '');
  for (const [name, re] of DOMAINS) if (re.test(base)) return name;
  return 'unsorted (sim)';
}
