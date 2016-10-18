import POGOProtos from "pokemongo-protobuf";

import print from "../../../print";

/**
 * @param {Object} msg
 */
export default function Encounter(msg) {

  let player = msg.player;

  // Try to use cached encounter
  let encounter = player.currentEncounter;

  // Dont use cached encounter
  if (
    encounter === null ||
    encounter.uid !== parseInt(msg.encounter_id)
  ) {
    encounter = this.getEncounterById(msg.encounter_id);
  }

  let buffer = {
    status: "ENCOUNTER_SUCCESS",
    capture_probability: {
      pokeball_type: ["ITEM_POKE_BALL", "ITEM_GREAT_BALL", "ITEM_ULTRA_BALL"],
      capture_probability: [1, 1, 1]
    }
  };

  // Invalid pkmn
  if (!encounter) {
    player.currentEncounter = null;
    buffer.status = "ENCOUNTER_NOT_FOUND";
  }
  // Already encountered
  else if (encounter.alreadyCatchedBy(player)) {
    buffer.status = "ENCOUNTER_ALREADY_HAPPENED";
  }
  // Encounter success
  else {
    player.currentEncounter = encounter;
    encounter.seenBy(player);
    buffer.wild_pokemon = encounter.serializeWild();
    buffer.wild_pokemon.pokemon_data.cp = encounter.getSeenCp(player);
    
    // Calculate final capture probabilities
    let tmpl = encounter.getPkmnTemplate(encounter.dexNumber);
    let lvlChance = .5 / encounter.cpMultiplier * tmpl.encounter.base_capture_rate;
    let arrayProbability = buffer.capture_probability.capture_probability;
    arrayProbability[0] = lvlChance;
    arrayProbability[1] = 1 - Math.pow(1 - lvlChance, 1.5);
    arrayProbability[2] = 1 - Math.pow(1 - lvlChance, 2);
    print(`Capture probabilities for ${player.username} are ${arrayProbability[0]}, ${arrayProbability[1]}, ${arrayProbability[2]}`, 36);
  }

  return (
    POGOProtos.serialize(buffer, "POGOProtos.Networking.Responses.EncounterResponse")
  );

}