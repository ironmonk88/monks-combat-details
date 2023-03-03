import { MonksCombatDetails, i18n } from "./monks-combat-details.js";

export const registerSettings = function () {
    // Register any custom module settings here
	let modulename = "monks-combat-details";

	const debouncedReload = foundry.utils.debounce(function () { window.location.reload(); }, 500);
	
	let dialogpositions = {
		'': '—',
		'topleft': 'Top Left',
		'topright': 'Top Right',
		'bottomleft': 'Bottom Left',
		'bottomright': 'Bottom Right'
	};

	let opencombatoptions = {
		'none': i18n("MonksCombatDetails.combatopen.none"),
		'everyone': i18n("MonksCombatDetails.combatopen.everyone"),
		'gmonly': i18n("MonksCombatDetails.combatopen.gm"),
		'playersonly': i18n("MonksCombatDetails.combatopen.players")
	};

	let autodefeated = {
		'none': i18n("MonksCombatDetails.autodefeated.none"),
		'npc-zero': i18n("MonksCombatDetails.autodefeated.npc-zero"),
		'npc-negative': i18n("MonksCombatDetails.autodefeated.npc-negative"),
		'all-zero': i18n("MonksCombatDetails.autodefeated.all-zero"),
		'all-negative': i18n("MonksCombatDetails.autodefeated.all-negative")
	};

	let spelloptions = {
		'prevent': i18n("MonksCombatDetails.spelloptions.prevent"),
		'true': i18n("MonksCombatDetails.spelloptions.true"),
		'false': i18n("MonksCombatDetails.spelloptions.false")
	}

	// combat preparation
	game.settings.register(modulename, "prevent-initiative", {
		name: i18n("MonksCombatDetails.prevent-initiative.name"),
		hint: i18n("MonksCombatDetails.prevent-initiative.hint"),
		scope: "world",
		config: true,
		default: true,
		type: Boolean,
	});
	game.settings.register(modulename, "prevent-token-removal", {
		name: i18n("MonksCombatDetails.prevent-token-removal.name"),
		hint: i18n("MonksCombatDetails.prevent-token-removal.hint"),
		scope: "world",
		config: true,
		default: true,
		type: Boolean,
	});
	game.settings.register(modulename, "prevent-combat-spells", {
		name: i18n("MonksCombatDetails.prevent-combat-spells.name"),
		hint: i18n("MonksCombatDetails.prevent-combat-spells.hint"),
		scope: "world",
		config: true,
		choices: spelloptions,
		default: true,
		type: String,
	});
	game.settings.register(modulename, "show-combat-cr", {
		name: i18n("MonksCombatDetails.show-combat-cr.name"),
		hint: i18n("MonksCombatDetails.show-combat-cr.hint"),
		scope: "world",
		config: MonksCombatDetails.canDo("show-combat-cr"),
		default: game.system.id != "pf2e",
		type: Boolean,
	});

	//combat details
	game.settings.register(modulename, "clear-targets", {
		name: i18n("MonksCombatDetails.clear-targets.name"),
		hint: i18n("MonksCombatDetails.clear-targets.hint"),
		scope: "client",
		config: true,
		default: true,
		type: Boolean
	});
	game.settings.register(modulename, "remember-previous", {
		name: i18n("MonksCombatDetails.remember-previous.name"),
		hint: i18n("MonksCombatDetails.remember-previous.hint"),
		scope: "client",
		config: true,
		default: true,
		type: Boolean,
		onChange: debouncedReload
	});
	game.settings.register(modulename, "round-chatmessages", {
		name: i18n("MonksCombatDetails.round-chatmessages.name"),
		hint: i18n("MonksCombatDetails.round-chatmessages.hint"),
		scope: "world",
		config: true,
		default: true,
		type: Boolean
	});
	game.settings.register(modulename, "show-start", {
		name: i18n("MonksCombatDetails.show-start.name"),
		hint: i18n("MonksCombatDetails.show-start.hint"),
		scope: "world",
		config: true,
		default: true,
		type: Boolean
	});

	game.settings.register(modulename, "pan-to-combatant", {
		name: i18n("MonksCombatDetails.pan-to-combatant.name"),
		hint: i18n("MonksCombatDetails.pan-to-combatant.hint"),
		scope: "client",
		default: false,
		type: Boolean,
		config: true
	});

	game.settings.register(modulename, "select-combatant", {
		name: i18n("MonksCombatDetails.select-combatant.name"),
		hint: i18n("MonksCombatDetails.select-combatant.hint"),
		scope: "client",
		config: true,
		default: true,
		type: Boolean
	});

	//combat tracker
	game.settings.register(modulename, "switch-combat-tab", {
		name: i18n("MonksCombatDetails.switch-combat-tab.name"),
		hint: i18n("MonksCombatDetails.switch-combat-tab.hint"),
		scope: "world",
		config: true,
		default: true,
		type: Boolean
	});
	game.settings.register(modulename, "popout-combat", {
		name: i18n("MonksCombatDetails.opencombat.name"),
		hint: i18n("MonksCombatDetails.opencombat.hint"),
		scope: "client",
		config: true,
		default: true,
		type: Boolean
	});
	game.settings.register(modulename, "opencombat", {
		name: i18n("MonksCombatDetails.opencombat.name"),
		hint: i18n("MonksCombatDetails.opencombat.hint"),
		scope: "world",
		config: true,
		choices: opencombatoptions,
		default: "everyone",
		type: String
	});
	game.settings.register(modulename, "combat-position", {
		name: i18n("MonksCombatDetails.combat-position.name"),
		hint: i18n("MonksCombatDetails.combat-position.hint"),
		scope: "client",
		default: "bottomright",
		type: String,
		choices: dialogpositions,
		config: true
	});
	game.settings.register(modulename, "close-combat-when-done", {
		name: i18n("MonksCombatDetails.close-combat-when-done.name"),
		hint: i18n("MonksCombatDetails.close-combat-when-done.hint"),
		scope: "world",
		config: true,
		default: true,
		type: Boolean,
	});
	game.settings.register(modulename, "hide-enemies", {
		name: i18n("MonksCombatDetails.hide-enemies.name"),
		hint: i18n("MonksCombatDetails.hide-enemies.hint"),
		scope: "world",
		config: true,
		default: false,
		type: Boolean,
		onChange: debouncedReload
	});
	game.settings.register(modulename, "hide-until-turn", {
		name: i18n("MonksCombatDetails.hide-until-turn.name"),
		hint: i18n("MonksCombatDetails.hide-until-turn.hint"),
		scope: "world",
		config: true,
		default: false,
		type: Boolean,
	});
	game.settings.register(modulename, "invisible-dead", {
		name: i18n("MonksCombatDetails.invisible-dead.name"),
		hint: i18n("MonksCombatDetails.invisible-dead.hint"),
		scope: "world",
		config: true,
		default: false,
		type: Boolean,
		onChange: debouncedReload
	});

	game.settings.register(modulename, "auto-defeated", {
		name: i18n("MonksCombatDetails.auto-defeated.name"),
		hint: i18n("MonksCombatDetails.auto-defeated.hint"),
		scope: "world",
		config: true,
		choices: autodefeated,
		default: (game.system.id == 'D35E' || game.system.id == 'pf1' ? 'npc-negative' : 'npc-zero'),
		type: String,
	});
	game.settings.register(modulename, "auto-reveal", {
		name: i18n("MonksCombatDetails.auto-reveal.name"),
		hint: i18n("MonksCombatDetails.auto-reveal.hint"),
		scope: "world",
		config: true,
		default: true,
		type: Boolean,
	});

	game.settings.register(modulename, "auto-scroll", {
		name: i18n("MonksCombatDetails.auto-scroll.name"),
		hint: i18n("MonksCombatDetails.auto-scroll.hint"),
		scope: "world",
		config: true,
		default: true,
		type: Boolean,
	});

	// Combat bars
	game.settings.register(modulename, "add-combat-bars", {
		name: i18n("MonksCombatDetails.add-combat-bars.name"),
		hint: i18n("MonksCombatDetails.add-combat-bars.hint"),
		scope: "world",
		config: true,
		default: false,
		type: Boolean,
	});
	game.settings.register(modulename, "combat-bar-opacity", {
		name: i18n("MonksCombatDetails.combat-bar-opacity.name"),
		hint: i18n("MonksCombatDetails.combat-bar-opacity.hint"),
		scope: "world",
		config: true,
		range: {
			min: 0,
			max: 1,
			step: 0.05,
		},
		default: 0.3,
		type: Number,
	});

	//Combat Turn
	game.settings.register(modulename, "shownextup", {
		name: i18n("MonksCombatDetails.shownextup.name"),
		hint: i18n("MonksCombatDetails.shownextup.hint"),
		scope: "client",
		config: true,
		default: true,
		type: Boolean,
	});
	game.settings.register(modulename, "showcurrentup", {
		name: i18n("MonksCombatDetails.showcurrentup.name"),
		hint: i18n("MonksCombatDetails.showcurrentup.hint"),
		scope: "client",
		config: true,
		default: true,
		type: Boolean,
	});
	game.settings.register(modulename, "large-print", {
		name: i18n("MonksCombatDetails.large-print.name"),
		hint: i18n("MonksCombatDetails.large-print.hint"),
		scope: "client",
		config: true,
		default: false,
		type: Boolean,
		onChange: debouncedReload
	});
	game.settings.register(modulename, "play-next-sound", {
		name: i18n("MonksCombatDetails.next-sound.name"),
		hint: i18n("MonksCombatDetails.next-sound.hint"),
		scope: "client",
		config: true,
		default: true,
		type: Boolean,
	});
	game.settings.register(modulename, "play-turn-sound", {
		name: i18n("MonksCombatDetails.turn-sound.name"),
		hint: i18n("MonksCombatDetails.turn-sound.hint"),
		scope: "client",
		config: true,
		default: true,
		type: Boolean,
	});
	game.settings.register(modulename, "play-round-sound", {
		name: i18n("MonksCombatDetails.round-sound.name"),
		hint: i18n("MonksCombatDetails.round-sound.hint"),
		scope: "client",
		config: true,
		default: true,
		type: Boolean,
	});
	game.settings.register(modulename, "next-sound", {
		name: i18n("MonksCombatDetails.next-sound.name"),
		hint: i18n("MonksCombatDetails.next-sound.hint"),
		scope: "world",
		config: true,
		default: "modules/monks-combat-details/sounds/next.ogg",
		type: String,
		//filePicker: 'audio',
	});
	game.settings.register(modulename, "turn-sound", {
		name: i18n("MonksCombatDetails.turn-sound.name"),
		hint: i18n("MonksCombatDetails.turn-sound.hint"),
		scope: "world",
		config: true,
		default: "modules/monks-combat-details/sounds/turn.ogg",
		type: String,
		//filePicker: 'audio',
	});
	game.settings.register(modulename, "round-sound", {
		name: i18n("MonksCombatDetails.round-sound.name"),
		hint: i18n("MonksCombatDetails.round-sound.hint"),
		scope: "world",
		config: true,
		default: "modules/monks-combat-details/sounds/round.ogg",
		type: String,
		//filePicker: 'audio',
	});
	game.settings.register(modulename, "volume", {
		name: i18n("MonksCombatDetails.volume.name"),
		hint: i18n("MonksCombatDetails.volume.hint"),
		scope: "client",
		config: true,
		range: {
			min: 0,
			max: 100,
			step: 10,
		},
		default: 60,
		type: Number,
	});
	/*
	game.settings.register(modulename, "disablesounds", {
		name: i18n("MonksCombatDetails.disablesounds.name"),
		hint: i18n("MonksCombatDetails.disablesounds.hint"),
		scope: "world",
		config: true,
		default: false,
		type: Boolean,
	});*/

	game.settings.register(modulename, "hide-defeated", {
		scope: "world",
		config: false,
		default: false,
		type: Boolean
	});

	game.settings.register(modulename, "transfer-settings", {
		scope: "world",
		config: false,
		default: false,
	});

	game.settings.register(modulename, "transfer-settings-client", {
		scope: "client",
		config: false,
		default: false,
	});
};
