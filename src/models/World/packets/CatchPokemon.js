import POGOProtos from "pokemongo-protobuf";

import print from "../../../print";

/**
 * @param {Object} msg
 */
export default function CatchPokemon(msg) {

  let buffer = null;
  let schema = "POGOProtos.Networking.Responses.CatchPokemonResponse";

  let player = msg.player;
  let bag = player.bag;
  let ball = bag.getLocalItemKey(msg.pokeball);

  let pkmn = msg.player.currentEncounter;

  player.bag[ball] -= 1;

  return new Promise((resolve) => {
    // Invalid pkmn
    if (!pkmn) {
      player.currentEncounter = null;
      pkmn.caughtBy(player);
      buffer = {
        status: "CATCH_ERROR"
      };
    // Missed
    } else if (!msg.hit_pokemon || !bag[ball]) {
      buffer = {
        status: "CATCH_MISSED"
      };
    } else {
        let tmpl = pkmn.getPkmnTemplate(pkmn.dexNumber);
        let lvlChance = .5 / pkmn.cpMultiplier * tmpl.encounter.base_capture_rate;
        let ballMultiplier = 1;
        
        if (ball == "great_ball") {
            ballMultiplier = 1.5;
        } else if (ball == "ultra_ball") {
            ballMultiplier = 2;
        }
        
        let finalChance = 1 - Math.pow(Math.pow(1 - lvlChance, ballMultiplier), msg.normalized_reticle_size);
        let random = Math.random();
        print(`${player.username} generated random number ${random}`, 36);
        
        if (random < finalChance || ball == "master_ball") {
            // Successful catch!
            player.catchPkmn(pkmn, msg.pokeball).then((result) => {
                resolve(POGOProtos.serialize(result, schema));
            });
            return void 0;
        } else {
            // Flee (if within base flee rate)
            random = Math.random();
            print(`For flee: ${random}`, 36);
            
            if (random < tmpl.encounter.base_flee_rate) {
                pkmn.caughtBy(player);
                player.currentEncounter = null;
                buffer = {
                    status: "CATCH_FLEE"
                };
                print(`${player.username}'s ${pkmn.getPkmnName()} fled. Sad face`, 36);
            } else {
                buffer = {
                    status: "CATCH_ESCAPE"
                };
                print(`${player.username}'s ${pkmn.getPkmnName()} escaped!`, 36);
            }
        }
    }
    resolve(POGOProtos.serialize(buffer, schema));
  });

}