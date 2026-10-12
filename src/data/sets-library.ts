// Daily VGC set library (Pokémon Champions, Regulation M-C).
//
// Each block starts with "#id tag tag ..." followed by a Showdown-format set.
// "EVs:" values are Champions Stat Points (max 32 per stat, 66 total).
// "@ A / B / C" lists items in order of preference; the team builder picks the
// first one not already used on the team (Item Clause).
//
// Tags
//   roles:      fakeout intimidate redirect tailwind trickroom speedctrl support pivot setup priority
//               physical special spread bulky fast slow
//   archetypes: set:<x> starts the condition, use:<x> wants it (x = sun rain sand snow tr tw)
//   flavor:     whimsy (fun / off-meta pick), meta (top-usage staple; used sparingly)

export const SETS_LIBRARY = `
#incineroar fakeout intimidate support pivot slow use:tr meta
Incineroar @ Sitrus Berry / Shuca Berry / Leftovers
Ability: Intimidate
EVs: 32 HP / 4 Atk / 2 Def / 28 SpD
Careful Nature
- Fake Out
- Flare Blitz
- Throat Chop
- Parting Shot

#rillaboom fakeout physical priority meta
Rillaboom @ Miracle Seed / Life Orb / Sitrus Berry
Ability: Grassy Surge
EVs: 32 HP / 32 Atk / 2 Spe
Adamant Nature
- Fake Out
- Grassy Glide
- Wood Hammer
- High Horsepower

#sneasler fakeout physical fast meta
Sneasler @ Focus Sash / White Herb / Life Orb
Ability: Unburden
EVs: 2 HP / 32 Atk / 32 Spe
Jolly Nature
- Fake Out
- Close Combat
- Dire Claw
- Protect

#whimsicott tailwind support set:tw fast meta
Whimsicott @ Focus Sash / Mental Herb / Light Clay
Ability: Prankster
EVs: 32 HP / 2 Def / 32 Spe
Timid Nature
- Tailwind
- Moonblast
- Encore
- Protect

#talonflame tailwind priority physical set:tw fast
Talonflame @ Sharp Beak / Focus Sash / Life Orb
Ability: Gale Wings
EVs: 2 HP / 32 Atk / 32 Spe
Jolly Nature
- Brave Bird
- Flare Blitz
- Tailwind
- Protect

#pelipper set:rain tailwind special support set:tw
Pelipper @ Damp Rock / Sitrus Berry / Leftovers
Ability: Drizzle
EVs: 32 HP / 2 Def / 32 SpA
Modest Nature
- Hurricane
- Weather Ball
- Tailwind
- Protect

#politoed set:rain support special bulky whimsy
Politoed @ Damp Rock / Sitrus Berry / Leftovers
Ability: Drizzle
EVs: 32 HP / 2 Def / 32 SpA
Modest Nature
- Weather Ball
- Ice Beam
- Helping Hand
- Protect

#basculegion use:rain physical fast priority meta
Basculegion @ Choice Scarf / Life Orb / Mystic Water
Ability: Swift Swim
EVs: 2 HP / 32 Atk / 32 Spe
Adamant Nature
- Wave Crash
- Last Respects
- Aqua Jet
- Flip Turn

#archaludon use:rain special bulky
Archaludon @ Leftovers / Sitrus Berry / Metal Coat
Ability: Stamina
EVs: 32 HP / 32 SpA / 2 SpD
Modest Nature
- Electro Shot
- Flash Cannon
- Draco Meteor
- Protect

#barbaracle use:rain special fast
Barbaracle @ Life Orb / Focus Sash / Hard Stone
Ability: Tough Claws
EVs: 2 HP / 32 Atk / 32 Spe
Jolly Nature
- Stone Edge
- Liquidation
- Shell Smash
- Protect

#swampert-mega use:rain physical mega
Swampert @ Swampertite
Ability: Damp
EVs: 32 HP / 32 Atk / 2 Spe
Adamant Nature
- Waterfall
- High Horsepower
- Ice Punch
- Protect

#golisopod physical priority use:rain
Golisopod @ Sitrus Berry / Leftovers / Shell Bell
Ability: Emergency Exit
EVs: 32 HP / 32 Atk / 2 SpD
Adamant Nature
- First Impression
- Liquidation
- Aqua Jet
- Protect

#golisopod-mega physical mega bulky slow use:tr
Golisopod @ Golisopite
Ability: Emergency Exit
EVs: 32 HP / 32 Atk / 2 SpD
Adamant Nature
- First Impression
- Liquidation
- Leech Life
- Protect

#blastoise-mega special mega bulky use:rain
Blastoise @ Blastoisinite
Ability: Rain Dish
EVs: 32 HP / 32 SpA / 2 Spe
Modest Nature
- Water Pulse
- Dark Pulse
- Aura Sphere
- Protect

#greninja-mega special mega fast
Greninja @ Greninjite
Ability: Protean
EVs: 2 HP / 32 SpA / 32 Spe
Timid Nature
- Hydro Pump
- Dark Pulse
- Ice Beam
- Protect

#feraligatr-mega physical mega setup
Feraligatr @ Feraligite
Ability: Sheer Force
EVs: 32 HP / 32 Atk / 2 Spe
Adamant Nature
- Dragon Dance
- Body Slam
- Liquidation
- Protect

#milotic bulky special support use:rain
Milotic @ Leftovers / Sitrus Berry / Mystic Water
Ability: Competitive
EVs: 32 HP / 2 SpA / 32 Def
Bold Nature
- Scald
- Ice Beam
- Recover
- Protect

#gyarados-mega intimidate setup physical mega
Gyarados @ Gyaradosite
Ability: Intimidate
EVs: 32 HP / 32 Atk / 2 Spe
Adamant Nature
- Dragon Dance
- Waterfall
- Crunch
- Protect

#gyarados intimidate setup physical
Gyarados @ Sitrus Berry / Lum Berry / Mystic Water
Ability: Intimidate
EVs: 32 HP / 32 Atk / 2 Spe
Adamant Nature
- Dragon Dance
- Waterfall
- Temper Flare
- Protect

#azumarill physical priority bulky
Azumarill @ Sitrus Berry / Mystic Water / Leftovers
Ability: Huge Power
EVs: 32 HP / 32 Atk / 2 SpD
Adamant Nature
- Aqua Jet
- Play Rough
- Liquidation
- Protect

#palafin physical fast priority whimsy
Palafin @ Mystic Water / Life Orb / Sitrus Berry
Ability: Zero to Hero
EVs: 2 HP / 32 Atk / 32 Spe
Jolly Nature
- Jet Punch
- Wave Crash
- Flip Turn
- Protect

#primarina special bulky use:rain
Primarina @ Sitrus Berry / Leftovers / Wise Glasses
Ability: Liquid Voice
EVs: 32 HP / 32 SpA / 2 SpD
Modest Nature
- Hyper Voice
- Moonblast
- Ice Beam
- Protect

#quaquaval physical setup fast
Quaquaval @ Lum Berry / Sitrus Berry / Life Orb
Ability: Moxie
EVs: 2 HP / 32 Atk / 32 Spe
Jolly Nature
- Aqua Step
- Close Combat
- Ice Spinner
- Protect

#starmie-mega physical mega fast whimsy
Starmie @ Starminite
Ability: Natural Cure
EVs: 2 HP / 32 Atk / 32 Spe
Jolly Nature
- Liquidation
- Zen Headbutt
- Ice Spinner
- Protect

#clawitzer special whimsy use:tr
Clawitzer @ Life Orb / Wise Glasses / Sitrus Berry
Ability: Mega Launcher
EVs: 32 HP / 32 SpA / 2 SpD
Quiet Nature
- Water Pulse
- Dark Pulse
- Aura Sphere
- Protect

#araquanid physical bulky slow use:tr whimsy
Araquanid @ Sitrus Berry / Leftovers / Mystic Water
Ability: Water Bubble
EVs: 32 HP / 32 Atk / 2 SpD
Brave Nature
- Liquidation
- Leech Life
- Wide Guard
- Protect

#torkoal set:sun special slow use:tr spread
Torkoal @ Charcoal / Heat Rock / Sitrus Berry
Ability: Drought
EVs: 32 HP / 32 SpA / 2 SpD
Quiet Nature
- Eruption
- Heat Wave
- Earth Power
- Protect

#ninetales set:sun special support fast
Ninetales @ Heat Rock / Focus Sash / Charcoal
Ability: Drought
EVs: 2 HP / 32 SpA / 32 Spe
Timid Nature
- Heat Wave
- Solar Beam
- Encore
- Protect

#charizard-mega-y set:sun special mega spread
Charizard @ Charizardite Y
Ability: Blaze
EVs: 2 HP / 32 SpA / 32 Spe
Timid Nature
- Heat Wave
- Solar Beam
- Weather Ball
- Protect

#charizard-mega-x physical mega setup
Charizard @ Charizardite X
Ability: Blaze
EVs: 2 HP / 32 Atk / 32 Spe
Jolly Nature
- Dragon Dance
- Flare Blitz
- Dragon Claw
- Protect

#venusaur use:sun special fast
Venusaur @ Life Orb / Focus Sash / Miracle Seed
Ability: Chlorophyll
EVs: 2 HP / 32 SpA / 32 Spe
Modest Nature
- Giga Drain
- Sludge Bomb
- Earth Power
- Protect

#venusaur-mega special mega bulky
Venusaur @ Venusaurite
Ability: Chlorophyll
EVs: 32 HP / 32 SpA / 2 SpD
Modest Nature
- Giga Drain
- Sludge Bomb
- Earth Power
- Protect

#meganium-mega special mega bulky use:sun
Meganium @ Meganiumite
Ability: Overgrow
EVs: 32 HP / 32 SpA / 2 SpD
Modest Nature
- Solar Beam
- Dazzling Gleam
- Earth Power
- Protect

#scovillain-mega special mega use:sun whimsy
Scovillain @ Scovillainite
Ability: Chlorophyll
EVs: 2 HP / 32 SpA / 32 Spe
Modest Nature
- Fire Blast
- Energy Ball
- Rage Powder
- Protect

#houndoom-mega special mega use:sun fast
Houndoom @ Houndoominite
Ability: Flash Fire
EVs: 2 HP / 32 SpA / 32 Spe
Timid Nature
- Heat Wave
- Dark Pulse
- Nasty Plot
- Protect

#arcanine intimidate support physical
Arcanine @ Sitrus Berry / Rocky Helmet / Charcoal
Ability: Intimidate
EVs: 32 HP / 2 Atk / 32 Spe
Jolly Nature
- Flare Blitz
- Extreme Speed
- Snarl
- Protect

#arcanine-hisui intimidate physical
Arcanine-Hisui @ Sitrus Berry / Hard Stone / Life Orb
Ability: Intimidate
EVs: 2 HP / 32 Atk / 32 Spe
Jolly Nature
- Flare Blitz
- Rock Slide
- Extreme Speed
- Protect

#typhlosion-hisui special spread use:sun
Typhlosion-Hisui @ Charcoal / Choice Scarf / Life Orb
Ability: Frisk
EVs: 2 HP / 32 SpA / 32 Spe
Modest Nature
- Eruption
- Heat Wave
- Shadow Ball
- Protect

#armarouge special support use:tr
Armarouge @ Sitrus Berry / Leftovers / Charcoal
Ability: Flash Fire
EVs: 32 HP / 32 SpA / 2 SpD
Quiet Nature
- Armor Cannon
- Expanding Force
- Trick Room
- Protect

#ceruledge physical setup
Ceruledge @ Lum Berry / Life Orb / Spell Tag
Ability: Flash Fire
EVs: 2 HP / 32 Atk / 32 Spe
Jolly Nature
- Bitter Blade
- Poltergeist
- Swords Dance
- Protect

#volcarona special setup use:sun
Volcarona @ Lum Berry / Sitrus Berry / Leftovers
Ability: Flame Body
EVs: 32 HP / 2 Def / 32 SpA
Modest Nature
- Quiver Dance
- Heat Wave
- Giga Drain
- Protect

#chandelure-mega special mega use:tr
Chandelure @ Chandelurite
Ability: Flash Fire
EVs: 32 HP / 32 SpA / 2 SpD
Quiet Nature
- Heat Wave
- Shadow Ball
- Trick Room
- Protect

#chandelure special use:tr spread
Chandelure @ Charcoal / Life Orb / Choice Scarf
Ability: Flash Fire
EVs: 32 HP / 32 SpA / 2 SpD
Quiet Nature
- Heat Wave
- Shadow Ball
- Energy Ball
- Protect

#skeledirge special bulky
Skeledirge @ Sitrus Berry / Leftovers / Spell Tag
Ability: Unaware
EVs: 32 HP / 32 SpA / 2 SpD
Modest Nature
- Torch Song
- Shadow Ball
- Slack Off
- Protect

#emboar-mega physical mega use:tr
Emboar @ Emboarite
Ability: Reckless
EVs: 32 HP / 32 Atk / 2 SpD
Brave Nature
- Flare Blitz
- Close Combat
- Head Smash
- Protect

#delphox-mega special mega fast
Delphox @ Delphoxite
Ability: Blaze
EVs: 2 HP / 32 SpA / 32 Spe
Timid Nature
- Heat Wave
- Psyshock
- Dazzling Gleam
- Protect

#pyroar-mega special mega fast whimsy
Pyroar @ Pyroarite
Ability: Unnerve
EVs: 2 HP / 32 SpA / 32 Spe
Timid Nature
- Heat Wave
- Hyper Voice
- Will-O-Wisp
- Protect

#blaziken-mega physical mega fast
Blaziken @ Blazikenite
Ability: Speed Boost
EVs: 2 HP / 32 Atk / 32 Spe
Adamant Nature
- Flare Blitz
- Close Combat
- Knock Off
- Protect

#camerupt-mega special mega slow use:tr spread
Camerupt @ Cameruptite
Ability: Solid Rock
EVs: 32 HP / 32 SpA / 2 SpD
Quiet Nature
- Eruption
- Heat Wave
- Earth Power
- Protect

#tyranitar-mega set:sand physical mega bulky
Tyranitar @ Tyranitarite
Ability: Sand Stream
EVs: 32 HP / 32 Atk / 2 Spe
Adamant Nature
- Rock Slide
- Knock Off
- High Horsepower
- Protect

#tyranitar set:sand physical bulky
Tyranitar @ Sitrus Berry / Chople Berry / Hard Stone
Ability: Sand Stream
EVs: 32 HP / 32 Atk / 2 SpD
Adamant Nature
- Rock Slide
- Knock Off
- Low Kick
- Protect

#hippowdon set:sand bulky support slow use:tr
Hippowdon @ Sitrus Berry / Leftovers / Smooth Rock
Ability: Sand Stream
EVs: 32 HP / 2 Atk / 32 Def
Impish Nature
- High Horsepower
- Yawn
- Slack Off
- Protect

#excadrill use:sand physical fast
Excadrill @ Life Orb / Focus Sash / Soft Sand
Ability: Sand Rush
EVs: 2 HP / 32 Atk / 32 Spe
Jolly Nature
- High Horsepower
- Iron Head
- Rock Slide
- Protect

#excadrill-mega physical mega use:sand
Excadrill @ Excadrite
Ability: Sand Rush
EVs: 2 HP / 32 Atk / 32 Spe
Adamant Nature
- High Horsepower
- Iron Head
- Rock Slide
- Protect

#garchomp-mega physical mega use:sand
Garchomp @ Garchompite
Ability: Rough Skin
EVs: 2 HP / 32 Atk / 32 Spe
Jolly Nature
- Dragon Claw
- Earthquake
- Rock Slide
- Protect

#garchomp-mega-z special mega fast
Garchomp @ Garchompite Z
Ability: Rough Skin
EVs: 2 HP / 32 SpA / 32 Spe
Timid Nature
- Draco Meteor
- Earth Power
- Fire Blast
- Protect

#garchomp physical meta fast
Garchomp @ Life Orb / Yache Berry / Focus Sash
Ability: Rough Skin
EVs: 2 HP / 32 Atk / 32 Spe
Jolly Nature
- Dragon Claw
- Earthquake
- Rock Slide
- Protect

#steelix-mega physical mega bulky slow use:tr use:sand
Steelix @ Steelixite
Ability: Sturdy
EVs: 32 HP / 32 Atk / 2 SpD
Brave Nature
- Heavy Slam
- Earthquake
- Rock Slide
- Protect

#aerodactyl-mega physical mega fast tailwind set:tw
Aerodactyl @ Aerodactylite
Ability: Unnerve
EVs: 2 HP / 32 Atk / 32 Spe
Jolly Nature
- Rock Slide
- Dual Wingbeat
- Tailwind
- Protect

#aerodactyl physical fast tailwind set:tw
Aerodactyl @ Focus Sash / Life Orb / Hard Stone
Ability: Unnerve
EVs: 2 HP / 32 Atk / 32 Spe
Jolly Nature
- Rock Slide
- Dual Wingbeat
- Tailwind
- Protect

#glimmora-mega special mega spread
Glimmora @ Glimmoranite
Ability: Toxic Debris
EVs: 32 HP / 32 SpA / 2 Spe
Modest Nature
- Power Gem
- Sludge Bomb
- Earth Power
- Protect

#rhyperior physical slow use:tr bulky
Rhyperior @ Sitrus Berry / Hard Stone / Leftovers
Ability: Solid Rock
EVs: 32 HP / 32 Atk / 2 SpD
Brave Nature
- Rock Slide
- High Horsepower
- Protect
- Swords Dance

#sandaconda bulky support whimsy set:sand
Sandaconda @ Sitrus Berry / Leftovers / Soft Sand
Ability: Sand Spit
EVs: 32 HP / 32 Atk / 2 Def
Adamant Nature
- High Horsepower
- Rock Slide
- Glare
- Protect

#mudsdale physical bulky slow use:tr whimsy
Mudsdale @ Sitrus Berry / Leftovers / Soft Sand
Ability: Stamina
EVs: 32 HP / 32 Atk / 2 SpD
Brave Nature
- High Horsepower
- Heavy Slam
- Rock Slide
- Protect

#krookodile intimidate physical
Krookodile @ Life Orb / Black Glasses / Focus Sash
Ability: Intimidate
EVs: 2 HP / 32 Atk / 32 Spe
Jolly Nature
- High Horsepower
- Knock Off
- Rock Slide
- Protect

#gliscor physical bulky support
Gliscor @ Leftovers / Sitrus Berry / Rocky Helmet
Ability: Hyper Cutter
EVs: 32 HP / 2 Atk / 32 Spe
Jolly Nature
- High Horsepower
- Knock Off
- Tailwind
- Protect

#abomasnow-mega set:snow special mega slow use:tr
Abomasnow @ Abomasite
Ability: Snow Warning
EVs: 32 HP / 32 SpA / 2 SpD
Quiet Nature
- Blizzard
- Giga Drain
- Ice Shard
- Protect

#ninetales-alola set:snow support fast special
Ninetales-Alola @ Light Clay / Focus Sash / Icy Rock
Ability: Snow Warning
EVs: 2 HP / 32 SpA / 32 Spe
Timid Nature
- Aurora Veil
- Blizzard
- Moonblast
- Protect

#froslass-mega set:snow special mega fast
Froslass @ Froslassite
Ability: Snow Cloak
EVs: 2 HP / 32 SpA / 32 Spe
Timid Nature
- Blizzard
- Shadow Ball
- Icy Wind
- Protect

#froslass speedctrl support fast whimsy
Froslass @ Focus Sash / Never-Melt Ice / Mental Herb
Ability: Cursed Body
EVs: 2 HP / 32 SpA / 32 Spe
Timid Nature
- Icy Wind
- Shadow Ball
- Will-O-Wisp
- Protect

#baxcalibur-mega physical mega use:snow
Baxcalibur @ Baxcalibrite
Ability: Thermal Exchange
EVs: 32 HP / 32 Atk / 2 Spe
Adamant Nature
- Glaive Rush
- Icicle Crash
- Ice Shard
- Protect

#baxcalibur physical use:snow
Baxcalibur @ Never-Melt Ice / Life Orb / Dragon Fang
Ability: Thermal Exchange
EVs: 2 HP / 32 Atk / 32 Spe
Jolly Nature
- Glaive Rush
- Icicle Crash
- Ice Shard
- Protect

#glalie-mega physical mega whimsy spread
Glalie @ Glalitite
Ability: Inner Focus
EVs: 2 HP / 32 Atk / 32 Spe
Jolly Nature
- Explosion
- Freeze-Dry
- Ice Shard
- Protect

#mamoswine physical slow use:tr priority
Mamoswine @ Never-Melt Ice / Life Orb / Focus Sash
Ability: Oblivious
EVs: 32 HP / 32 Atk / 2 SpD
Brave Nature
- Icicle Crash
- High Horsepower
- Ice Shard
- Protect

#beartic physical whimsy use:snow slow use:tr
Beartic @ Sitrus Berry / Never-Melt Ice / Life Orb
Ability: Slush Rush
EVs: 32 HP / 32 Atk / 2 SpD
Adamant Nature
- Icicle Crash
- Close Combat
- Aqua Jet
- Protect

#avalugg-hisui physical bulky slow use:tr whimsy
Avalugg-Hisui @ Sitrus Berry / Leftovers / Hard Stone
Ability: Sturdy
EVs: 32 HP / 32 Atk / 2 SpD
Brave Nature
- Mountain Gale
- Rock Slide
- Body Press
- Protect

#crabominable-mega physical mega slow use:tr whimsy
Crabominable @ Crabominite
Ability: Iron Fist
EVs: 32 HP / 32 Atk / 2 SpD
Brave Nature
- Ice Hammer
- Drain Punch
- Mach Punch
- Protect

#glaceon special use:snow whimsy
Glaceon @ Never-Melt Ice / Sitrus Berry / Leftovers
Ability: Ice Body
EVs: 32 HP / 32 SpA / 2 SpD
Modest Nature
- Blizzard
- Freeze-Dry
- Shadow Ball
- Protect

#vanilluxe special set:snow use:snow whimsy
Vanilluxe @ Never-Melt Ice / Focus Sash / Life Orb
Ability: Snow Warning
EVs: 2 HP / 32 SpA / 32 Spe
Modest Nature
- Blizzard
- Freeze-Dry
- Flash Cannon
- Protect

#mr-rime special support whimsy use:tr
Mr. Rime @ Sitrus Berry / Leftovers / Never-Melt Ice
Ability: Screen Cleaner
EVs: 32 HP / 32 SpA / 2 SpD
Quiet Nature
- Freeze-Dry
- Psychic
- Trick Room
- Protect

#hatterene trickroom set:tr special slow bulky
Hatterene @ Sitrus Berry / Mental Herb / Leftovers
Ability: Magic Bounce
EVs: 32 HP / 32 SpA / 2 Def
Quiet Nature
- Trick Room
- Expanding Force
- Dazzling Gleam
- Protect

#farigiraf trickroom set:tr support bulky slow
Farigiraf @ Sitrus Berry / Mental Herb / Leftovers
Ability: Armor Tail
EVs: 32 HP / 2 SpA / 32 Def
Relaxed Nature
- Trick Room
- Hyper Voice
- Helping Hand
- Protect

#oranguru trickroom set:tr support slow whimsy
Oranguru @ Mental Herb / Sitrus Berry / Leftovers
Ability: Inner Focus
EVs: 32 HP / 32 Def / 2 SpD
Sassy Nature
- Trick Room
- Instruct
- Psychic
- Protect

#reuniclus trickroom set:tr special slow bulky
Reuniclus @ Sitrus Berry / Mental Herb / Leftovers
Ability: Magic Guard
EVs: 32 HP / 32 SpA / 2 Def
Quiet Nature
- Trick Room
- Psychic
- Focus Blast
- Protect

#cofagrigus trickroom set:tr support slow whimsy
Cofagrigus @ Mental Herb / Sitrus Berry / Leftovers
Ability: Mummy
EVs: 32 HP / 32 Def / 2 SpD
Relaxed Nature
- Trick Room
- Will-O-Wisp
- Shadow Ball
- Protect

#gourgeist-super trickroom set:tr support slow whimsy
Gourgeist-Super @ Sitrus Berry / Mental Herb / Leftovers
Ability: Frisk
EVs: 32 HP / 32 Def / 2 SpD
Relaxed Nature
- Trick Room
- Will-O-Wisp
- Poltergeist
- Protect

#sinistcha redirect support bulky slow use:tr
Sinistcha @ Sitrus Berry / Leftovers / Mental Herb
Ability: Hospitality
EVs: 32 HP / 32 Def / 2 SpA
Bold Nature
- Matcha Gotcha
- Rage Powder
- Trick Room
- Protect

#slowbro-mega trickroom set:tr special mega bulky slow
Slowbro @ Slowbronite
Ability: Regenerator
EVs: 32 HP / 32 SpA / 2 Def
Quiet Nature
- Trick Room
- Scald
- Psyshock
- Protect

#slowking-galar trickroom set:tr special slow bulky
Slowking-Galar @ Sitrus Berry / Mental Herb / Leftovers
Ability: Regenerator
EVs: 32 HP / 32 SpA / 2 SpD
Quiet Nature
- Trick Room
- Sludge Bomb
- Psychic
- Protect

#musharna trickroom set:tr support slow whimsy
Musharna @ Mental Herb / Sitrus Berry / Leftovers
Ability: Telepathy
EVs: 32 HP / 32 Def / 2 SpD
Relaxed Nature
- Trick Room
- Psychic
- Helping Hand
- Protect

#indeedee-f redirect support use:tr
Indeedee-F @ Sitrus Berry / Mental Herb / Leftovers
Ability: Psychic Surge
EVs: 32 HP / 32 Def / 2 SpD
Bold Nature
- Follow Me
- Helping Hand
- Psychic
- Protect

#gardevoir-mega special mega spread
Gardevoir @ Gardevoirite
Ability: Trace
EVs: 2 HP / 32 SpA / 32 Spe
Modest Nature
- Hyper Voice
- Psyshock
- Protect
- Trick Room

#gallade-mega physical mega fast
Gallade @ Galladite
Ability: Sharpness
EVs: 2 HP / 32 Atk / 32 Spe
Jolly Nature
- Sacred Sword
- Psycho Cut
- Leaf Blade
- Protect

#alakazam-mega special mega fast
Alakazam @ Alakazite
Ability: Inner Focus
EVs: 2 HP / 32 SpA / 32 Spe
Timid Nature
- Psychic
- Shadow Ball
- Dazzling Gleam
- Protect

#medicham-mega physical mega fakeout
Medicham @ Medichamite
Ability: Telepathy
EVs: 2 HP / 32 Atk / 32 Spe
Jolly Nature
- Fake Out
- High Jump Kick
- Zen Headbutt
- Bullet Punch

#metagross-mega physical mega fast
Metagross @ Metagrossite
Ability: Clear Body
EVs: 2 HP / 32 Atk / 32 Spe
Jolly Nature
- Iron Head
- Zen Headbutt
- Bullet Punch
- Protect

#meowstic-mega special mega support whimsy
Meowstic-F @ Meowsticite
Ability: Competitive
EVs: 2 HP / 32 SpA / 32 Spe
Timid Nature
- Psychic
- Shadow Ball
- Fake Out
- Protect

#meowstic-m support fast whimsy
Meowstic @ Light Clay / Mental Herb / Focus Sash
Ability: Prankster
EVs: 32 HP / 2 Def / 32 Spe
Timid Nature
- Reflect
- Light Screen
- Fake Out
- Psychic

#malamar-mega physical mega setup whimsy
Malamar @ Malamarite
Ability: Contrary
EVs: 32 HP / 32 Atk / 2 Spe
Adamant Nature
- Superpower
- Knock Off
- Psycho Cut
- Protect

#espathra special fast setup whimsy
Espathra @ Focus Sash / Life Orb / Twisted Spoon
Ability: Speed Boost
EVs: 2 HP / 32 SpA / 32 Spe
Timid Nature
- Lumina Crash
- Dazzling Gleam
- Shadow Ball
- Protect

#chimecho-mega special mega support bulky whimsy
Chimecho @ Chimechite
Ability: Levitate
EVs: 32 HP / 32 SpA / 2 SpD
Modest Nature
- Psychic
- Flash Cannon
- Helping Hand
- Protect

#espeon special fast support
Espeon @ Light Clay / Focus Sash / Twisted Spoon
Ability: Magic Bounce
EVs: 2 HP / 32 SpA / 32 Spe
Timid Nature
- Psychic
- Dazzling Gleam
- Reflect
- Protect

#kangaskhan-mega physical mega fakeout
Kangaskhan @ Kangaskhanite
Ability: Scrappy
EVs: 2 HP / 32 Atk / 32 Spe
Jolly Nature
- Fake Out
- Double-Edge
- Sucker Punch
- Protect

#lopunny-mega physical mega fakeout fast
Lopunny @ Lopunnite
Ability: Limber
EVs: 2 HP / 32 Atk / 32 Spe
Jolly Nature
- Fake Out
- High Jump Kick
- Triple Axel
- Protect

#pidgeot-mega special mega tailwind set:tw fast whimsy
Pidgeot @ Pidgeotite
Ability: Keen Eye
EVs: 2 HP / 32 SpA / 32 Spe
Timid Nature
- Hurricane
- Heat Wave
- Tailwind
- Protect

#staraptor-mega physical mega fast
Staraptor @ Staraptite
Ability: Intimidate
EVs: 2 HP / 32 Atk / 32 Spe
Jolly Nature
- Brave Bird
- Close Combat
- Quick Attack
- Protect

#staraptor intimidate physical fast tailwind set:tw
Staraptor @ Sharp Beak / Focus Sash / Life Orb
Ability: Intimidate
EVs: 2 HP / 32 Atk / 32 Spe
Jolly Nature
- Brave Bird
- Close Combat
- Tailwind
- Protect

#corviknight tailwind support bulky set:tw
Corviknight @ Leftovers / Sitrus Berry / Rocky Helmet
Ability: Mirror Armor
EVs: 32 HP / 2 Atk / 32 SpD
Careful Nature
- Brave Bird
- Tailwind
- Roost
- Protect

#skarmory-mega physical mega tailwind set:tw
Skarmory @ Skarmorite
Ability: Sturdy
EVs: 32 HP / 32 Atk / 2 Spe
Adamant Nature
- Brave Bird
- Iron Head
- Tailwind
- Protect

#toucannon physical whimsy slow use:tr
Toucannon @ Life Orb / Sharp Beak / Sitrus Berry
Ability: Skill Link
EVs: 32 HP / 32 Atk / 2 SpD
Brave Nature
- Bullet Seed
- Rock Blast
- Beak Blast
- Protect

#squawkabilly tailwind support whimsy set:tw
Squawkabilly @ Focus Sash / Sitrus Berry / Mental Herb
Ability: Intimidate
EVs: 2 HP / 32 Atk / 32 Spe
Jolly Nature
- Parting Shot
- Tailwind
- Brave Bird
- Protect

#hawlucha-mega physical mega fast
Hawlucha @ Hawluchanite
Ability: Unburden
EVs: 2 HP / 32 Atk / 32 Spe
Jolly Nature
- Brave Bird
- Close Combat
- Acrobatics
- Protect

#noivern special fast tailwind set:tw
Noivern @ Focus Sash / Life Orb / Dragon Fang
Ability: Infiltrator
EVs: 2 HP / 32 SpA / 32 Spe
Timid Nature
- Boomburst
- Draco Meteor
- Tailwind
- Protect

#dragonite-mega special mega bulky
Dragonite @ Dragoninite
Ability: Multiscale
EVs: 32 HP / 32 SpA / 2 Spe
Modest Nature
- Draco Meteor
- Hurricane
- Thunderbolt
- Protect

#dragonite physical bulky priority meta
Dragonite @ Sitrus Berry / Lum Berry / Dragon Fang
Ability: Multiscale
EVs: 32 HP / 32 Atk / 2 Spe
Adamant Nature
- Extreme Speed
- Scale Shot
- Fire Punch
- Protect

#salamence-mega physical mega fast intimidate meta
Salamence @ Salamencite
Ability: Intimidate
EVs: 2 HP / 32 Atk / 32 Spe
Jolly Nature
- Double-Edge
- Dragon Claw
- Tailwind
- Protect

#altaria-mega physical mega bulky whimsy
Altaria @ Altarianite
Ability: Natural Cure
EVs: 32 HP / 32 Atk / 2 Spe
Adamant Nature
- Double-Edge
- Earthquake
- Dragon Dance
- Protect

#hydreigon special fast
Hydreigon @ Life Orb / Focus Sash / Black Glasses
Ability: Levitate
EVs: 2 HP / 32 SpA / 32 Spe
Timid Nature
- Dark Pulse
- Draco Meteor
- Snarl
- Protect

#dragapult physical fast
Dragapult @ Focus Sash / Life Orb / Spell Tag
Ability: Clear Body
EVs: 2 HP / 32 Atk / 32 Spe
Jolly Nature
- Dragon Darts
- Phantom Force
- U-turn
- Protect

#kommo-o special setup
Kommo-o @ Sitrus Berry / Lum Berry / Leftovers
Ability: Soundproof
EVs: 32 HP / 32 SpA / 2 Spe
Modest Nature
- Clanging Scales
- Aura Sphere
- Flash Cannon
- Protect

#goodra-hisui special bulky slow use:tr
Goodra-Hisui @ Leftovers / Sitrus Berry / Metal Coat
Ability: Sap Sipper
EVs: 32 HP / 32 SpA / 2 SpD
Quiet Nature
- Draco Meteor
- Flash Cannon
- Fire Blast
- Protect

#flapple physical whimsy setup
Flapple @ Sitrus Berry / Lum Berry / Dragon Fang
Ability: Hustle
EVs: 32 HP / 32 Atk / 2 Spe
Adamant Nature
- Grav Apple
- Dragon Rush
- Dragon Dance
- Protect

#hydrapple special bulky slow use:tr
Hydrapple @ Sitrus Berry / Leftovers / Miracle Seed
Ability: Regenerator
EVs: 32 HP / 32 SpA / 2 SpD
Quiet Nature
- Draco Meteor
- Giga Drain
- Earth Power
- Protect

#appletun support bulky slow use:tr whimsy
Appletun @ Sitrus Berry / Leftovers / Miracle Seed
Ability: Thick Fat
EVs: 32 HP / 32 SpA / 2 SpD
Quiet Nature
- Apple Acid
- Draco Meteor
- Recover
- Protect

#drampa-mega special mega slow use:tr spread
Drampa @ Drampanite
Ability: Berserk
EVs: 32 HP / 32 SpA / 2 SpD
Quiet Nature
- Hyper Voice
- Draco Meteor
- Heat Wave
- Protect

#dragalge-mega special mega bulky slow use:tr
Dragalge @ Dragalgite
Ability: Adaptability
EVs: 32 HP / 32 SpA / 2 SpD
Quiet Nature
- Sludge Bomb
- Draco Meteor
- Focus Blast
- Protect

#tyrantrum physical whimsy
Tyrantrum @ Life Orb / Hard Stone / Sitrus Berry
Ability: Strong Jaw
EVs: 2 HP / 32 Atk / 32 Spe
Jolly Nature
- Psychic Fangs
- Rock Slide
- Dragon Dance
- Protect

#ampharos-mega special mega slow use:tr
Ampharos @ Ampharosite
Ability: Static
EVs: 32 HP / 32 SpA / 2 SpD
Quiet Nature
- Thunderbolt
- Dragon Pulse
- Focus Blast
- Protect

#raichu-mega-y special mega fast
Raichu @ Raichunite Y
Ability: Lightning Rod
EVs: 2 HP / 32 SpA / 32 Spe
Timid Nature
- Thunderbolt
- Focus Blast
- Fake Out
- Protect

#raichu-mega-x physical mega fast fakeout
Raichu @ Raichunite X
Ability: Lightning Rod
EVs: 2 HP / 32 Atk / 32 Spe
Jolly Nature
- Fake Out
- Wild Charge
- Brick Break
- Protect

#raichu-alola fakeout support fast whimsy
Raichu-Alola @ Focus Sash / Magnet / Twisted Spoon
Ability: Surge Surfer
EVs: 2 HP / 32 SpA / 32 Spe
Timid Nature
- Fake Out
- Thunderbolt
- Psychic
- Protect

#pikachu fakeout whimsy fast
Pikachu @ Light Ball
Ability: Lightning Rod
EVs: 2 HP / 32 SpA / 32 Spe
Timid Nature
- Fake Out
- Thunderbolt
- Grass Knot
- Protect

#manectric-mega special mega intimidate fast
Manectric @ Manectite
Ability: Lightning Rod
EVs: 2 HP / 32 SpA / 32 Spe
Timid Nature
- Thunderbolt
- Overheat
- Snarl
- Protect

#manectric support fast speedctrl
Manectric @ Sitrus Berry / Magnet / Focus Sash
Ability: Lightning Rod
EVs: 2 HP / 32 SpA / 32 Spe
Timid Nature
- Thunderbolt
- Volt Switch
- Snarl
- Protect

#eelektross-mega physical mega whimsy
Eelektross @ Eelektrossite
Ability: Levitate
EVs: 32 HP / 32 Atk / 2 Spe
Adamant Nature
- Wild Charge
- Drain Punch
- Knock Off
- Protect

#luxray intimidate physical
Luxray @ Sitrus Berry / Magnet / Life Orb
Ability: Intimidate
EVs: 32 HP / 32 Atk / 2 Spe
Adamant Nature
- Wild Charge
- Crunch
- Ice Fang
- Protect

#rotom-wash special support bulky
Rotom-Wash @ Sitrus Berry / Leftovers / Mystic Water
Ability: Levitate
EVs: 32 HP / 32 SpA / 2 SpD
Modest Nature
- Hydro Pump
- Thunderbolt
- Will-O-Wisp
- Protect

#rotom-heat special support bulky
Rotom-Heat @ Sitrus Berry / Leftovers / Charcoal
Ability: Levitate
EVs: 32 HP / 32 SpA / 2 SpD
Modest Nature
- Overheat
- Thunderbolt
- Will-O-Wisp
- Protect

#rotom-frost special support whimsy speedctrl
Rotom-Frost @ Sitrus Berry / Never-Melt Ice / Leftovers
Ability: Levitate
EVs: 32 HP / 32 SpA / 2 Spe
Modest Nature
- Blizzard
- Thunderbolt
- Electroweb
- Protect

#rotom-mow special support whimsy
Rotom-Mow @ Sitrus Berry / Miracle Seed / Leftovers
Ability: Levitate
EVs: 32 HP / 32 SpA / 2 Spe
Modest Nature
- Leaf Storm
- Thunderbolt
- Electroweb
- Protect

#bellibolt special bulky slow use:tr whimsy
Bellibolt @ Sitrus Berry / Leftovers / Magnet
Ability: Electromorphosis
EVs: 32 HP / 32 SpA / 2 SpD
Quiet Nature
- Thunderbolt
- Muddy Water
- Slack Off
- Protect

#pawmot fakeout physical fast support
Pawmot @ Focus Sash / Sitrus Berry / Life Orb
Ability: Iron Fist
EVs: 2 HP / 32 Atk / 32 Spe
Jolly Nature
- Fake Out
- Double Shock
- Close Combat
- Revival Blessing

#toxtricity special spread whimsy
Toxtricity @ Life Orb / Magnet / Sitrus Berry
Ability: Punk Rock
EVs: 2 HP / 32 SpA / 32 Spe
Modest Nature
- Overdrive
- Boomburst
- Sludge Bomb
- Protect

#dedenne support speedctrl whimsy
Dedenne @ Sitrus Berry / Focus Sash / Mental Herb
Ability: Cheek Pouch
EVs: 32 HP / 2 SpA / 32 Spe
Timid Nature
- Nuzzle
- Helping Hand
- Electroweb
- Protect

#morpeko fakeout physical whimsy
Morpeko @ Sitrus Berry / Focus Sash / Life Orb
Ability: Hunger Switch
EVs: 2 HP / 32 Atk / 32 Spe
Jolly Nature
- Fake Out
- Aura Wheel
- Knock Off
- Protect

#heliolisk special fast whimsy use:sun
Heliolisk @ Focus Sash / Life Orb / Magnet
Ability: Solar Power
EVs: 2 HP / 32 SpA / 32 Spe
Timid Nature
- Thunderbolt
- Weather Ball
- Grass Knot
- Protect

#emolga support speedctrl whimsy
Emolga @ Focus Sash / Mental Herb / Sitrus Berry
Ability: Motor Drive
EVs: 32 HP / 2 SpA / 32 Spe
Timid Nature
- Encore
- Nuzzle
- Electroweb
- Protect

#gholdengo special bulky meta
Gholdengo @ Sitrus Berry / Leftovers / Metal Coat
Ability: Good as Gold
EVs: 32 HP / 32 SpA / 2 Spe
Modest Nature
- Make It Rain
- Shadow Ball
- Nasty Plot
- Protect

#kingambit physical slow use:tr priority meta
Kingambit @ Black Glasses / Lum Berry / Sitrus Berry
Ability: Defiant
EVs: 32 HP / 32 Atk / 2 SpD
Adamant Nature
- Kowtow Cleave
- Iron Head
- Sucker Punch
- Protect

#scizor-mega physical mega priority bulky
Scizor @ Scizorite
Ability: Technician
EVs: 32 HP / 32 Atk / 2 SpD
Adamant Nature
- Bullet Punch
- Bug Bite
- Swords Dance
- Protect

#scizor physical priority bulky
Scizor @ Sitrus Berry / Metal Coat / Occa Berry
Ability: Technician
EVs: 32 HP / 32 Atk / 2 SpD
Adamant Nature
- Bullet Punch
- Bug Bite
- Close Combat
- Protect

#aegislash special physical
Aegislash @ Spell Tag / Leftovers / Sitrus Berry
Ability: Stance Change
EVs: 32 HP / 32 SpA / 2 Atk
Quiet Nature
- Shadow Ball
- Flash Cannon
- Shadow Sneak
- King's Shield

#mawile-mega physical mega intimidate slow use:tr
Mawile @ Mawilite
Ability: Intimidate
EVs: 32 HP / 32 Atk / 2 SpD
Brave Nature
- Play Rough
- Iron Head
- Sucker Punch
- Protect

#aggron-mega physical mega bulky slow use:tr
Aggron @ Aggronite
Ability: Rock Head
EVs: 32 HP / 32 Atk / 2 SpD
Brave Nature
- Heavy Slam
- Rock Slide
- Body Press
- Protect

#bastiodon support bulky slow whimsy use:tr
Bastiodon @ Sitrus Berry / Leftovers / Mental Herb
Ability: Sturdy
EVs: 32 HP / 2 Def / 32 SpD
Sassy Nature
- Wide Guard
- Iron Defense
- Body Press
- Protect

#tinkaton physical support
Tinkaton @ Sitrus Berry / Leftovers / Fairy Feather
Ability: Mold Breaker
EVs: 32 HP / 32 Atk / 2 Spe
Adamant Nature
- Gigaton Hammer
- Play Rough
- Fake Out
- Protect

#perrserker physical whimsy slow use:tr
Perrserker @ Sitrus Berry / Metal Coat / Life Orb
Ability: Steely Spirit
EVs: 32 HP / 32 Atk / 2 SpD
Brave Nature
- Iron Head
- Close Combat
- Fake Out
- Protect

#klefki support whimsy
Klefki @ Light Clay / Mental Herb / Sitrus Berry
Ability: Prankster
EVs: 32 HP / 2 Def / 32 SpD
Calm Nature
- Reflect
- Light Screen
- Dazzling Gleam
- Thunder Wave

#orthworm bulky support slow whimsy use:tr
Orthworm @ Sitrus Berry / Leftovers / Rocky Helmet
Ability: Earth Eater
EVs: 32 HP / 2 Atk / 32 Def
Impish Nature
- Iron Head
- Body Press
- Shed Tail
- Protect

#lucario-mega physical mega fast priority
Lucario @ Lucarionite
Ability: Inner Focus
EVs: 2 HP / 32 Atk / 32 Spe
Jolly Nature
- Close Combat
- Meteor Mash
- Extreme Speed
- Protect

#lucario-mega-z special mega fast
Lucario @ Lucarionite Z
Ability: Inner Focus
EVs: 2 HP / 32 SpA / 32 Spe
Timid Nature
- Aura Sphere
- Flash Cannon
- Vacuum Wave
- Protect

#absol-mega-z physical mega fast
Absol @ Absolite Z
Ability: Super Luck
EVs: 2 HP / 32 Atk / 32 Spe
Jolly Nature
- Night Slash
- Psycho Cut
- Sucker Punch
- Protect

#absol-mega physical mega
Absol @ Absolite
Ability: Super Luck
EVs: 2 HP / 32 Atk / 32 Spe
Jolly Nature
- Knock Off
- Sucker Punch
- Play Rough
- Protect

#heracross-mega physical mega
Heracross @ Heracronite
Ability: Guts
EVs: 32 HP / 32 Atk / 2 Spe
Adamant Nature
- Close Combat
- Rock Blast
- Pin Missile
- Protect

#pinsir-mega physical mega fast
Pinsir @ Pinsirite
Ability: Moxie
EVs: 2 HP / 32 Atk / 32 Spe
Jolly Nature
- Body Slam
- Close Combat
- Quick Attack
- Protect

#beedrill-mega physical mega fast whimsy
Beedrill @ Beedrillite
Ability: Sniper
EVs: 2 HP / 32 Atk / 32 Spe
Jolly Nature
- Poison Jab
- U-turn
- Drill Run
- Protect

#scolipede-mega physical mega bulky
Scolipede @ Scolipite
Ability: Speed Boost
EVs: 32 HP / 32 Atk / 2 Spe
Adamant Nature
- Poison Jab
- Megahorn
- Rock Slide
- Protect

#scrafty-mega intimidate fakeout physical mega bulky
Scrafty @ Scraftinite
Ability: Intimidate
EVs: 32 HP / 2 Atk / 32 SpD
Careful Nature
- Fake Out
- Drain Punch
- Knock Off
- Coaching

#scrafty intimidate fakeout support bulky
Scrafty @ Sitrus Berry / Leftovers / Rocky Helmet
Ability: Intimidate
EVs: 32 HP / 2 Atk / 32 SpD
Careful Nature
- Fake Out
- Drain Punch
- Knock Off
- Coaching

#conkeldurr physical slow use:tr
Conkeldurr @ Black Belt / Sitrus Berry / Life Orb
Ability: Guts
EVs: 32 HP / 32 Atk / 2 SpD
Brave Nature
- Drain Punch
- Mach Punch
- Knock Off
- Protect

#annihilape physical bulky
Annihilape @ Leftovers / Sitrus Berry / Lum Berry
Ability: Defiant
EVs: 32 HP / 32 Atk / 2 Spe
Adamant Nature
- Rage Fist
- Drain Punch
- Bulk Up
- Protect

#machamp physical slow use:tr whimsy
Machamp @ Sitrus Berry / Black Belt / Life Orb
Ability: No Guard
EVs: 32 HP / 32 Atk / 2 SpD
Brave Nature
- Dynamic Punch
- Knock Off
- Wide Guard
- Protect

#falinks-mega physical mega whimsy
Falinks @ Falinksite
Ability: Defiant
EVs: 32 HP / 32 Atk / 2 Spe
Adamant Nature
- Close Combat
- Poison Jab
- No Retreat
- Protect

#chesnaught-mega physical mega bulky slow use:tr
Chesnaught @ Chesnaughtite
Ability: Bulletproof
EVs: 32 HP / 32 Atk / 2 SpD
Adamant Nature
- Wood Hammer
- Drain Punch
- Spiky Shield
- Wide Guard

#barbaracle-mega physical mega setup
Barbaracle @ Barbaracite
Ability: Tough Claws
EVs: 32 HP / 32 Atk / 2 Spe
Adamant Nature
- Shell Smash
- Stone Edge
- Liquidation
- Protect

#passimian physical support whimsy
Passimian @ Sitrus Berry / Black Belt / Leftovers
Ability: Defiant
EVs: 32 HP / 32 Atk / 2 Spe
Adamant Nature
- Close Combat
- Knock Off
- U-turn
- Protect

#grapploct physical bulky whimsy slow use:tr
Grapploct @ Sitrus Berry / Leftovers / Black Belt
Ability: Technician
EVs: 32 HP / 32 Atk / 2 SpD
Brave Nature
- Drain Punch
- Octolock
- Brutal Swing
- Protect

#toxicroak fakeout physical support
Toxicroak @ Sitrus Berry / Focus Sash / Life Orb
Ability: Dry Skin
EVs: 32 HP / 32 Atk / 2 Spe
Adamant Nature
- Fake Out
- Drain Punch
- Gunk Shot
- Protect

#sirfetchd physical whimsy
Sirfetch’d @ Leek
Ability: Scrappy
EVs: 2 HP / 32 Atk / 32 Spe
Jolly Nature
- Close Combat
- Brave Bird
- Knock Off
- Protect

#tauros-paldea-aqua intimidate physical whimsy use:rain
Tauros-Paldea-Aqua @ Sitrus Berry / Mystic Water / Life Orb
Ability: Intimidate
EVs: 2 HP / 32 Atk / 32 Spe
Jolly Nature
- Wave Crash
- Close Combat
- Rock Slide
- Protect

#tauros-paldea-blaze intimidate physical whimsy use:sun
Tauros-Paldea-Blaze @ Sitrus Berry / Charcoal / Life Orb
Ability: Intimidate
EVs: 2 HP / 32 Atk / 32 Spe
Jolly Nature
- Raging Bull
- Close Combat
- Flare Blitz
- Protect

#sylveon special bulky spread
Sylveon @ Sitrus Berry / Fairy Feather / Leftovers
Ability: Pixilate
EVs: 32 HP / 32 SpA / 2 SpD
Modest Nature
- Hyper Voice
- Shadow Ball
- Quick Attack
- Protect

#clefable-mega special mega support bulky
Clefable @ Clefablite
Ability: Unaware
EVs: 32 HP / 32 SpA / 2 Def
Modest Nature
- Moonblast
- Follow Me
- Air Slash
- Protect

#clefable redirect support bulky
Clefable @ Sitrus Berry / Leftovers / Mental Herb
Ability: Magic Guard
EVs: 32 HP / 32 Def / 2 SpD
Bold Nature
- Follow Me
- Moonblast
- Helping Hand
- Protect

#wigglytuff support whimsy redirect
Wigglytuff @ Sitrus Berry / Leftovers / Mental Herb
Ability: Competitive
EVs: 32 HP / 32 SpA / 2 SpD
Modest Nature
- Hyper Voice
- Dazzling Gleam
- Icy Wind
- Protect

#floette-mega special mega
Floette-Eternal @ Floettite
Ability: Flower Veil
EVs: 32 HP / 32 SpA / 2 Spe
Modest Nature
- Light of Ruin
- Moonblast
- Calm Mind
- Protect

#florges special bulky support
Florges @ Sitrus Berry / Leftovers / Fairy Feather
Ability: Flower Veil
EVs: 32 HP / 32 SpA / 2 Def
Modest Nature
- Moonblast
- Dazzling Gleam
- Calm Mind
- Protect

#grimmsnarl support fakeout bulky
Grimmsnarl @ Light Clay / Sitrus Berry / Mental Herb
Ability: Prankster
EVs: 32 HP / 2 Atk / 32 SpD
Careful Nature
- Reflect
- Light Screen
- Fake Out
- Spirit Break

#alcremie support redirect whimsy
Alcremie @ Sitrus Berry / Leftovers / Mental Herb
Ability: Aroma Veil
EVs: 32 HP / 32 SpA / 2 Def
Modest Nature
- Decorate
- Dazzling Gleam
- Alluring Voice
- Protect

#slurpuff special setup whimsy
Slurpuff @ Sitrus Berry / Fairy Feather / Leftovers
Ability: Unburden
EVs: 32 HP / 32 SpA / 2 Spe
Modest Nature
- Dazzling Gleam
- Draining Kiss
- Calm Mind
- Protect

#aromatisse trickroom set:tr support slow whimsy
Aromatisse @ Sitrus Berry / Mental Herb / Leftovers
Ability: Aroma Veil
EVs: 32 HP / 32 Def / 2 SpD
Relaxed Nature
- Trick Room
- Moonblast
- Heal Pulse
- Protect

#mimikyu trickroom set:tr physical
Mimikyu @ Life Orb / Spell Tag / Sitrus Berry
Ability: Disguise
EVs: 2 HP / 32 Atk / 32 Spe
Adamant Nature
- Play Rough
- Shadow Claw
- Trick Room
- Protect

#gengar-mega special mega fast
Gengar @ Gengarite
Ability: Cursed Body
EVs: 2 HP / 32 SpA / 32 Spe
Timid Nature
- Shadow Ball
- Sludge Bomb
- Icy Wind
- Protect

#gengar special fast speedctrl
Gengar @ Focus Sash / Life Orb / Spell Tag
Ability: Cursed Body
EVs: 2 HP / 32 SpA / 32 Spe
Timid Nature
- Shadow Ball
- Sludge Bomb
- Icy Wind
- Protect

#banette-mega physical mega slow use:tr whimsy
Banette @ Banettite
Ability: Frisk
EVs: 32 HP / 32 Atk / 2 SpD
Adamant Nature
- Shadow Sneak
- Poltergeist
- Gunk Shot
- Protect

#sableye-mega support mega bulky whimsy slow
Sableye @ Sablenite
Ability: Prankster
EVs: 32 HP / 2 Def / 32 SpD
Careful Nature
- Fake Out
- Will-O-Wisp
- Foul Play
- Protect

#sableye support fakeout whimsy
Sableye @ Sitrus Berry / Mental Herb / Leftovers
Ability: Prankster
EVs: 32 HP / 2 Def / 32 SpD
Careful Nature
- Fake Out
- Will-O-Wisp
- Quash
- Protect

#golurk-mega physical mega slow use:tr whimsy
Golurk @ Golurkite
Ability: Iron Fist
EVs: 32 HP / 32 Atk / 2 SpD
Brave Nature
- Drain Punch
- Poltergeist
- High Horsepower
- Protect

#polteageist special setup whimsy
Polteageist @ White Herb / Focus Sash / Spell Tag
Ability: Cursed Body
EVs: 2 HP / 32 SpA / 32 Spe
Modest Nature
- Shell Smash
- Shadow Ball
- Giga Drain
- Protect

#trevenant trickroom set:tr physical slow whimsy
Trevenant @ Sitrus Berry / Mental Herb / Leftovers
Ability: Harvest
EVs: 32 HP / 32 Atk / 2 SpD
Brave Nature
- Trick Room
- Wood Hammer
- Poltergeist
- Protect

#runerigus trickroom set:tr support slow whimsy
Runerigus @ Sitrus Berry / Mental Herb / Leftovers
Ability: Wandering Spirit
EVs: 32 HP / 2 Def / 32 SpD
Sassy Nature
- Trick Room
- Poltergeist
- Will-O-Wisp
- Protect

#spiritomb support whimsy
Spiritomb @ Sitrus Berry / Leftovers / Mental Herb
Ability: Infiltrator
EVs: 32 HP / 2 Def / 32 SpD
Careful Nature
- Foul Play
- Will-O-Wisp
- Snarl
- Protect

#houndstone physical whimsy slow use:tr
Houndstone @ Spell Tag / Sitrus Berry / Life Orb
Ability: Fluffy
EVs: 32 HP / 32 Atk / 2 SpD
Brave Nature
- Last Respects
- Body Press
- Play Rough
- Protect

#umbreon support bulky
Umbreon @ Leftovers / Sitrus Berry / Rocky Helmet
Ability: Inner Focus
EVs: 32 HP / 2 Def / 32 SpD
Calm Nature
- Foul Play
- Snarl
- Helping Hand
- Protect

#weavile physical fakeout fast
Weavile @ Focus Sash / Never-Melt Ice / Life Orb
Ability: Pressure
EVs: 2 HP / 32 Atk / 32 Spe
Jolly Nature
- Fake Out
- Triple Axel
- Knock Off
- Protect

#mabosstiff intimidate physical whimsy
Mabosstiff @ Sitrus Berry / Black Glasses / Leftovers
Ability: Intimidate
EVs: 32 HP / 32 Atk / 2 SpD
Adamant Nature
- Crunch
- Psychic Fangs
- Play Rough
- Protect

#thievul support whimsy fast
Thievul @ Focus Sash / Mental Herb / Sitrus Berry
Ability: Unburden
EVs: 2 HP / 32 SpA / 32 Spe
Timid Nature
- Snarl
- Foul Play
- Parting Shot
- Protect

#zoroark-hisui special fast whimsy
Zoroark-Hisui @ Focus Sash / Life Orb / Spell Tag
Ability: Illusion
EVs: 2 HP / 32 SpA / 32 Spe
Timid Nature
- Bitter Malice
- Hyper Voice
- Focus Blast
- Protect

#samurott-hisui physical fast
Samurott-Hisui @ Focus Sash / Life Orb / Black Glasses
Ability: Sharpness
EVs: 2 HP / 32 Atk / 32 Spe
Jolly Nature
- Ceaseless Edge
- Razor Shell
- Sacred Sword
- Protect

#sharpedo-mega physical mega fast
Sharpedo @ Sharpedonite
Ability: Speed Boost
EVs: 2 HP / 32 Atk / 32 Spe
Adamant Nature
- Liquidation
- Crunch
- Psychic Fangs
- Protect

#overqwil intimidate physical whimsy
Overqwil @ Sitrus Berry / Poison Barb / Black Glasses
Ability: Intimidate
EVs: 32 HP / 32 Atk / 2 Spe
Adamant Nature
- Crunch
- Gunk Shot
- Throat Chop
- Protect

#salazzle fakeout special fast
Salazzle @ Focus Sash / Life Orb / Charcoal
Ability: Corrosion
EVs: 2 HP / 32 SpA / 32 Spe
Timid Nature
- Fake Out
- Sludge Bomb
- Heat Wave
- Protect

#victreebel-mega special mega use:sun
Victreebel @ Victreebelite
Ability: Chlorophyll
EVs: 2 HP / 32 SpA / 32 Spe
Modest Nature
- Leaf Storm
- Sludge Bomb
- Sleep Powder
- Protect

#vileplume support use:sun whimsy
Vileplume @ Sitrus Berry / Leftovers / Miracle Seed
Ability: Effect Spore
EVs: 32 HP / 32 SpA / 2 Def
Modest Nature
- Giga Drain
- Sludge Bomb
- Pollen Puff
- Strength Sap

#roserade special fast use:sun
Roserade @ Focus Sash / Life Orb / Miracle Seed
Ability: Technician
EVs: 2 HP / 32 SpA / 32 Spe
Timid Nature
- Leaf Storm
- Sludge Bomb
- Dazzling Gleam
- Protect

#serperior special fast
Serperior @ Life Orb / Miracle Seed / Focus Sash
Ability: Contrary
EVs: 2 HP / 32 SpA / 32 Spe
Timid Nature
- Leaf Storm
- Dragon Pulse
- Glare
- Protect

#sceptile-mega special mega fast
Sceptile @ Sceptilite
Ability: Overgrow
EVs: 2 HP / 32 SpA / 32 Spe
Timid Nature
- Leaf Storm
- Dragon Pulse
- Focus Blast
- Protect

#tsareena physical support whimsy
Tsareena @ Sitrus Berry / Miracle Seed / Leftovers
Ability: Queenly Majesty
EVs: 32 HP / 32 Atk / 2 Spe
Adamant Nature
- Power Whip
- Triple Axel
- High Jump Kick
- Protect

#meowscarada physical fast
Meowscarada @ Focus Sash / Life Orb / Miracle Seed
Ability: Protean
EVs: 2 HP / 32 Atk / 32 Spe
Jolly Nature
- Flower Trick
- Knock Off
- U-turn
- Protect

#decidueye-hisui physical whimsy slow use:tr
Decidueye-Hisui @ Sitrus Berry / Life Orb / Miracle Seed
Ability: Scrappy
EVs: 32 HP / 32 Atk / 2 SpD
Brave Nature
- Triple Arrows
- Leaf Blade
- Knock Off
- Protect

#arboliva special bulky slow use:tr whimsy
Arboliva @ Sitrus Berry / Leftovers / Miracle Seed
Ability: Seed Sower
EVs: 32 HP / 32 SpA / 2 SpD
Quiet Nature
- Energy Ball
- Hyper Voice
- Strength Sap
- Protect

#torterra physical slow use:tr whimsy
Torterra @ Sitrus Berry / Miracle Seed / Leftovers
Ability: Overgrow
EVs: 32 HP / 32 Atk / 2 SpD
Brave Nature
- Wood Hammer
- Headlong Rush
- Rock Slide
- Wide Guard

#gogoat physical bulky whimsy
Gogoat @ Sitrus Berry / Leftovers / Miracle Seed
Ability: Sap Sipper
EVs: 32 HP / 32 Atk / 2 SpD
Adamant Nature
- Horn Leech
- High Horsepower
- Bulk Up
- Protect

#kleavor physical fast whimsy
Kleavor @ Focus Sash / Life Orb / Silver Powder
Ability: Sharpness
EVs: 2 HP / 32 Atk / 32 Spe
Jolly Nature
- Stone Axe
- X-Scissor
- Close Combat
- Protect

#vivillon support fast whimsy speedctrl
Vivillon @ Focus Sash / Mental Herb / Sitrus Berry
Ability: Compound Eyes
EVs: 2 HP / 32 SpA / 32 Spe
Timid Nature
- Hurricane
- Sleep Powder
- Rage Powder
- Protect

#maushold support fast whimsy
Maushold @ Wide Lens / Silk Scarf / Focus Sash
Ability: Technician
EVs: 2 HP / 32 Atk / 32 Spe
Jolly Nature
- Population Bomb
- Follow Me
- Taunt
- Protect

#snorlax physical bulky slow use:tr
Snorlax @ Leftovers / Sitrus Berry / Silk Scarf
Ability: Thick Fat
EVs: 32 HP / 32 Atk / 2 SpD
Brave Nature
- Body Slam
- High Horsepower
- Belly Drum
- Protect

#audino-mega support mega bulky slow use:tr whimsy
Audino @ Audinite
Ability: Regenerator
EVs: 32 HP / 32 Def / 2 SpA
Bold Nature
- Hyper Voice
- Heal Pulse
- Helping Hand
- Protect

#diggersby physical whimsy
Diggersby @ Sitrus Berry / Life Orb / Silk Scarf
Ability: Huge Power
EVs: 32 HP / 32 Atk / 2 Spe
Adamant Nature
- Body Slam
- High Horsepower
- Quick Attack
- Protect

#furfrou intimidate support whimsy
Furfrou @ Sitrus Berry / Leftovers / Rocky Helmet
Ability: Fur Coat
EVs: 32 HP / 2 Atk / 32 SpD
Careful Nature
- Double-Edge
- Snarl
- Thunder Wave
- Protect

#castform special whimsy use:rain
Castform @ Mystic Water / Life Orb / Focus Sash
Ability: Forecast
EVs: 2 HP / 32 SpA / 32 Spe
Timid Nature
- Weather Ball
- Thunder
- Ice Beam
- Protect

#ditto whimsy
Ditto @ Choice Scarf
Ability: Imposter
EVs: 32 HP / 2 Def / 32 SpD
Calm Nature
- Transform

#lycanroc-dusk physical fast
Lycanroc-Dusk @ Life Orb / Focus Sash / Hard Stone
Ability: Tough Claws
EVs: 2 HP / 32 Atk / 32 Spe
Jolly Nature
- Accelerock
- Stone Edge
- Close Combat
- Protect

#garganacl bulky support slow use:tr
Garganacl @ Leftovers / Sitrus Berry / Hard Stone
Ability: Purifying Salt
EVs: 32 HP / 2 Atk / 32 SpD
Careful Nature
- Salt Cure
- Wide Guard
- Recover
- Protect

#rampardos physical whimsy
Rampardos @ Focus Sash / Life Orb / Hard Stone
Ability: Sheer Force
EVs: 2 HP / 32 Atk / 32 Spe
Jolly Nature
- Rock Slide
- Head Smash
- Zen Headbutt
- Protect

#aurorus special whimsy slow use:tr use:snow
Aurorus @ Sitrus Berry / Never-Melt Ice / Leftovers
Ability: Refrigerate
EVs: 32 HP / 32 SpA / 2 SpD
Quiet Nature
- Hyper Voice
- Ancient Power
- Earth Power
- Protect
`;
