import { registerSettings } from "./settings.js";
import { WithMonksCombatTracker } from "./apps/combattracker.js";
import { CombatBars } from "./js/combat-bars.js";
import { CombatTurn } from "./js/combat-turn.js";

export let debugEnabled = 0;

export let debug = (...args) => {
    if (debugEnabled > 1) console.log("DEBUG: monks-combat-details | ", ...args);
};
export let log = (...args) => console.log("monks-combat-details | ", ...args);
export let warn = (...args) => {
    if (debugEnabled > 0) console.warn("WARN: monks-combat-details | ", ...args);
};
export let error = (...args) => console.error("monks-combat-details | ", ...args);

export const setDebugLevel = (debugText) => {
    debugEnabled = { none: 0, warn: 1, debug: 2, all: 3 }[debugText] || 0;
    // 0 = none, warnings = 1, debug = 2, all = 3
    if (debugEnabled >= 3)
        CONFIG.debug.hooks = true;
};

export let i18n = key => {
    return game.i18n.localize(key);
};
export let setting = key => {
    return game.settings.get("monks-combat-details", key);
};

export let combatposition = () => {
    return game.settings.get("monks-combat-details", "combat-position");
};

export let patchFunc = (prop, func, type = "WRAPPER") => {
    if (game.modules.get("lib-wrapper")?.active) {
        libWrapper.register("monks-combat-details", prop, func, type);
    } else {
        const oldFunc = eval(prop);
        eval(`${prop} = function (event) {
            return func.call(this, oldFunc.bind(this), ...arguments);
        }`);
    }
}

export class MonksCombatDetails {
    static tracker = false;

    static canDo(setting) {
        //needs to not be on the reject list, and if there is an only list, it needs to be on it.
        if (MonksCombatDetails._rejectlist[setting] != undefined && MonksCombatDetails._rejectlist[setting].includes(game.system.id))
            return false;
        if (MonksCombatDetails._onlylist[setting] != undefined && !MonksCombatDetails._onlylist[setting].includes(game.system.id))
            return false;
        return true;
    };

    static init() {
        if (game.MonksCombatDetails == undefined)
            game.MonksCombatDetails = MonksCombatDetails;

        try {
            Object.defineProperty(User.prototype, "isTheGM", {
                get: function isTheGM() {
                    return this == (game.users.find(u => u.hasRole("GAMEMASTER") && u.active) || game.users.find(u => u.hasRole("ASSISTANT") && u.active));
                }
            });
        } catch {}

        MonksCombatDetails.SOCKET = "module.monks-combat-details";

        MonksCombatDetails._rejectlist = {
        }
        MonksCombatDetails._onlylist = {
            "sort-by-columns": ["dnd5e"],
            "show-combat-cr": ["dnd5e", "pf2e"]
        }

        if (game.system.id == 'dnd5e')
            MonksCombatDetails.xpchart = CONFIG.DND5E.CR_EXP_LEVELS;
        else if (game.system.id == 'pf2e') {
            MonksCombatDetails.xpchart = [40, 60, 80, 120, 160];
        } else if (game.system.id == 'pf1e') {
            MonksCombatDetails.xpchart = [50, 400, 600, 800, 1200, 1600, 2400, 3200, 4800, 6400, 9600, 12800, 19200, 25600, 38400, 51200, 76800, 102400, 153600, 204800, 307200, 409600, 614400, 819200, 1228800, 1638400, 2457600, 3276800, 4915200, 6553600, 9830400];
        }

        MonksCombatDetails.crChallenge = [
            { text: (game.system.id == 'pf2e' ? "MonksCombatDetails.trivial" : "MonksCombatDetails.easy"), rating: 'easy' },
            { text: (game.system.id == 'pf2e' ? "MonksCombatDetails.low" : "MonksCombatDetails.average"), rating: 'average' },
            { text: (game.system.id == 'pf2e' ? "MonksCombatDetails.moderate" : "MonksCombatDetails.challenging"), rating: 'challenging' },
            { text: (game.system.id == 'pf2e' ? "MonksCombatDetails.severe" : "MonksCombatDetails.hard"), rating: 'hard' },
            { text: (game.system.id == 'pf2e' ? "MonksCombatDetails.extreme" : "MonksCombatDetails.epic"), rating: 'epic' }
        ];

        registerSettings();

        CombatTurn.init();

        CONFIG.ui.combat = WithMonksCombatTracker(CONFIG.ui.combat);

        if (setting('add-combat-bars'))
            CombatBars.init();

        patchFunc("CombatTrackerConfig.prototype._updateObject", async (wrapped, ...args) => {
            let [event, formData] = args;
            game.settings.set("monks-combat-details", "hide-defeated", formData.hideDefeated);
            $('#combat-popout').toggleClass("hide-defeated", formData.hideDefeated == true);
            return wrapped(...args);
        });

        let combatStart = async function (wrapped, ...args) {
            if (setting("prevent-initiative") && this.turns.find(c => c.initiative == undefined) != undefined) {
                return await Dialog.confirm({
                    title: "Not all Initiative have been rolled",
                    content: `<p>There are combatants that havn't rolled their initiative.<br/>Do you wish to continue with starting the combat?</p>`,
                    yes: () => { return wrapped.call(this); }
                })
            } else 
                return wrapped.call(this);
        }

        if (game.modules.get("lib-wrapper")?.active) {
            libWrapper.register("monks-combat-details", "Combat.prototype.startCombat", combatStart, "MIXED");
        } else {
            const oldStartCombat = Combat.prototype.startCombat;
            Combat.prototype.startCombat = function () {
                return combatStart.call(this, oldStartCombat.bind(this), ...arguments);
            }
        }

        if (game.settings.get("monks-combat-details", "prevent-token-removal")) {
            let oldToggleCombat = TokenHUD.prototype._onToggleCombat;
            TokenHUD.prototype._onToggleCombat = function (event) {
                if (this.object.inCombat) {
                    ui.notifications.warn(i18n("MonksCombatDetails.PreventTokenMessage"));
                    event.preventDefault();
                    return false;
                } else {
                    return oldToggleCombat.call(this, event);
                }
            }
        }
    }

    static async ready() {
        CombatTurn.ready();
        CombatTurn.checkCombatTurn(game.combats.active);

        game.socket.on(MonksCombatDetails.SOCKET, MonksCombatDetails.onMessage);

        if (!setting("transfer-settings") && game.user.isGM && game.modules.get("monks-little-details")?.active) {
            MonksCombatDetails.transferSettings();
        }
        if (!setting("transfer-settings-client") && game.modules.get("monks-little-details")?.active) {
            MonksCombatDetails.transferSettingsClient();
        }
    }

    static async transferSettings() {
        let swapFilename = function (value, name) {
            if (value && (name === "next-sound" || name === "turn-sound" || name === "round-sound")) {
                value = value.replace("monks-little-details", "monks-combat-details");
            }

            return value;
        }
        let setSetting = async function (name) {
            let oldChange = game.settings.settings.get(`monks-combat-details.${name}`).onChange;
            game.settings.settings.get(`monks-combat-details.${name}`).onChange = null;
            let value = swapFilename(game.settings.get("monks-little-details", name), name);
            await game.settings.set("monks-combat-details", name, value);
            game.settings.settings.get(`monks-combat-details.${name}`).onChange = oldChange;
        }

        await setSetting("show-combat-cr");
        await setSetting("switch-combat-tab");
        await setSetting("hide-enemies");
        await setSetting("hide-until-turn");
        await setSetting("prevent-initiative");
        await setSetting("opencombat");
        await setSetting("close-combat-when-done");
        await setSetting("prevent-token-removal");
        await setSetting("prevent-combat-spells");
        await setSetting("auto-defeated");
        await setSetting("invisible-dead");
        await setSetting("auto-reveal");
        await setSetting("auto-scroll");
        await setSetting("add-combat-bars");
        await setSetting("combat-bar-opacity");
        await setSetting("next-sound");
        await setSetting("turn-sound");
        await setSetting("round-sound");
        await setSetting("round-chatmessages");
        await setSetting("show-start");
        await setSetting("hide-defeated");

        for (let scene of game.scenes) {
            for (let token of scene.tokens) {
                if (getProperty(token, "flags.monks-little-details.displayBarsCombat")) {
                    await token.update({ "flags.monks-combat-details.displayBarsCombat": getProperty(token, "flags.monks-little-details.displayBarsCombat") });
                }
            }
        }

        for (let actor of game.actors) {
            if (getProperty(actor.prototypeToken, "flags.monks-little-details.displayBarsCombat")) {
                await actor.prototypeToken.update({ "flags.monks-combat-details.displayBarsCombat": getProperty(actor.prototypeToken, "flags.monks-little-details.displayBarsCombat") });
            }
        }

        ui.notifications.warn("Monk's Combat Details has transfered over settings from Monk's Little Details, you will need to refresh your browser for some settings to take effect.", { permanent: true });

        await game.settings.set("monks-combat-details", "transfer-settings", true);
    }

    static async transferSettingsClient() {
        let setSetting = async function (name) {
            let oldChange = game.settings.settings.get(`monks-combat-details.${name}`).onChange;
            game.settings.settings.get(`monks-combat-details.${name}`).onChange = null;
            await game.settings.set("monks-combat-details", name, game.settings.get("monks-little-details", name));
            game.settings.settings.get(`monks-combat-details.${name}`).onChange = oldChange;
        }

        await setSetting("popout-combat");
        await setSetting("combat-position");
        await setSetting("shownextup");
        await setSetting("showcurrentup");
        await setSetting("large-print");
        await setSetting("play-next-sound");
        await setSetting("play-turn-sound");
        await setSetting("play-round-sound");
        await setSetting("volume");
        await setSetting("clear-targets");
        await setSetting("remember-previous");
        await setSetting("pan-to-combatant");
        await setSetting("select-combatant");

        ui.notifications.warn("Monk's Combat Details has transfered over your personal settings from Monk's Little Details, you will need to refresh your browser for some settings to take effect.", { permanent: true });

        await game.settings.set("monks-combat-details", "transfer-settings-client", true);
    }

    static repositionCombat(app) {
        //we want to start the dialog in a different corner
        let sidebar = document.getElementById("ui-right");
        let players = document.getElementById("players");

        app.position.left = (combatposition().endsWith('left') ? 120 : (sidebar.offsetLeft - app.position.width));
        app.position.top = (combatposition().startsWith('top') ?
            (combatposition().endsWith('left') ? 70 : (sidebar.offsetTop - 3)) :
            (combatposition().endsWith('left') ? (players.offsetTop - app.position.height - 3) : (sidebar.offsetTop + sidebar.offsetHeight - app.position.height - 3)));

        $(app._element).css({ top: app.position.top, left: app.position.left });
    }

    static getCRText (cr) {
        switch (cr) {
            case 0.13: return '⅛';
            case 0.17: return '⅙';
            case 0:
            case 0.25: return '¼';
            case 0.33: return '⅓';
            case 0.5: return '½';
            default: return cr;
        }
    }

    static getCR(combat) {
        var apl = { count: 0, levels: 0 };
        var xp = 0;

        if (game.system.id == 'pf2e') {
            //cr will just be a -1 to 3 value (representing trivial - extreme)
            //apl will not be passed forward, instead XP is passed forward

            //note, should be referenced by xpByRelLevel[relLevel + 4]
            var xpByRelLevel = [0, 10, 15, 20, 30, 40, 60, 80, 120, 160];

            //note that this needs to be multiplied by party size
            var AdjByXP = [10, 15, 20, 30, 40]

            //determine APL, and modifiers if necessary
            for (let combatant of combat.combatants) {
                if (combatant.actor != undefined && combatant.token != undefined && combatant.token.disposition == 1) {
                    apl.count = apl.count + 1;
                    let levels = combatant?.actor.system.details?.level?.value || combatant?.actor.system.details?.level || 0;

                    apl.levels += levels;
                }
            }

            var calcAPL = 0;
            if (apl.count > 0)
                calcAPL = Math.round(apl.levels / apl.count);
            //this approximation is fine -- most pf2e parties should all be the same level, but otherwise we can just round

            //for each enemy, determine its xp value
            for (let combatant of combat.combatants) {
                if (combatant.actor != undefined && combatant.token != undefined && combatant.token.disposition != 1) {
                    var level = 0;
                    level = parseInt(combatant?.actor.system.details?.level?.value ?? 0);
                    var relLevel = level - calcAPL;
                    xp += xpByRelLevel[Math.clamped(relLevel + 5, 0, xpByRelLevel.length - 1)];
                }
            }

            if (apl.count != 4) {
                let partyAdj = MonksCombatDetails.xpchart.filter((budget, index) => xp >= budget || index == 0);
                let partyXP = AdjByXP[Math.clamped(partyAdj.length - 1, 0, AdjByXP.length - 1)];
                xp += partyXP * (apl.count - 4) * -1;
            }

            var partyCR = MonksCombatDetails.xpchart.filter((budget, index) => xp >= budget || index == 0);
            return { cr: partyCR.length - 1, xp: xp };
        } else {
            //get the APL of friendly combatants
            for (let combatant of combat.combatants) {
                if (combatant.actor != undefined && combatant.token != undefined) {
                    if (combatant.token.disposition == 1) {
                        apl.count = apl.count + 1;
                        let levels = 0;
                        if (combatant.actor.system?.classes) {
                            levels = Object.values(combatant.actor.system?.classes).reduce((a, b) => {
                                return a + (b?.levels || b?.level || 0);
                            }, 0);
                        } else {
                            levels = combatant?.actor.system.details?.level?.value || combatant?.actor.system.details?.level || 0;
                        }

                        apl.levels += levels;
                    } else {
                        let combatantxp = combatant?.actor.system.details?.xp?.value;
                        if (combatantxp == undefined) {
                            let levels = 0;
                            if (combatant?.actor.system?.classes && Object.entities(combatant.actor.system?.classes).length)
                                levels = combatant.actor.system?.classes?.reduce(c => { return c.levels; });
                            else if (combatant?.actor.system.details?.level?.value)
                                levels = parseInt(combatant?.actor.system.details?.level?.value);
                            combatantxp = MonksCombatDetails.xpchart[Math.clamped(levels, 0, MonksCombatDetails.xpchart.length - 1)];
                        }
                        xp += (combatantxp || 0);
                    }
                }
            };

            var calcAPL = 0;
            if (apl.count > 0)
                calcAPL = Math.round(apl.levels / apl.count) + (apl.count < 4 ? -1 : (apl.count > 5 ? 1 : 0));

            //get the CR of any unfriendly/neutral
            let cr = Math.clamped(MonksCombatDetails.xpchart.findIndex(cr => cr > xp) - 1, 0, MonksCombatDetails.xpchart.length - 1);

            return { cr: cr, apl: calcAPL };
        }
    }

    static checkPopout(combat, delta) {
        let combatStarted = (combat && combat.started === true && ((delta.round === 1 && combat.turn === 0 ) || delta.bypass));

        //log("update combat", combat);
        let opencombat = setting("opencombat");

        //popout combat (if gm and opencombat is everyone or gm only), (if player and opencombat is everyone or players only and popout-combat)
        if (((game.user.isGM && ['everyone', 'gmonly'].includes(opencombat)) ||
            (!game.user.isGM && ['everyone', 'playersonly'].includes(opencombat) && game.settings.get("monks-combat-details", "popout-combat")))
            && combatStarted) {
            //new combat, pop it out
            const tabApp = ui["combat"];
            tabApp.renderPopout(tabApp);

            if (ui.sidebar.activeTab !== "chat")
                ui.sidebar.activateTab("chat");
        }

        if (combatposition() !== '' && delta.active === true) {
            //+++ make sure if it's not this players turn and it's not the GM to add padding for the button at the bottom
            MonksCombatDetails.tracker = false;   //delete this so that the next render will reposition the popout, changing between combats changes the height
        }
    }

    static emit(action, args = {}) {
        args.action = action;
        args.senderId = game.user.id;
        game.socket.emit(MonksCombatDetails.SOCKET, args, (resp) => { });
    }

    static onMessage(data) {
        MonksCombatDetails[data.action].call(MonksCombatDetails, data);
    }

    static async showShadows(data) {
        fromUuid(data.uuid).then((token) => {
            if (token && (token.isOwner || game.user.isGM)) {
                CombatTurn.showShadow(token.object, data.x, data.y);
            }
        });
    }

    static async removeShadow(data) {
        CombatTurn.removeShadow(data.id);
    }

    static async spellChange(data) {
        if (game.user.isTheGM) {
            let whisper = ChatMessage.getWhisperRecipients("GM");
            let player = game.users.find(u => u.id == data.user);
            let actor = game.actors.find(a => a.id == data.actor);
            ChatMessage.create({
                user: game.user,
                content: `<i>${player?.name}</i> has changed prepared spells (${data.name}) for <b>${actor?.name}</b> while token is in combat.`,
                whisper: whisper
            });
        }
    }

    static isDefeated(token) {
        return (token && (token.combatant && token.combatant.defeated) || token.actor?.effects.find(e => e.getFlag("core", "statusId") === CONFIG.specialStatusEffects.DEFEATED) || token.document.overlayEffect == CONFIG.controlIcons.defeated);
    }

}

Hooks.once('init', MonksCombatDetails.init);
Hooks.on("ready", MonksCombatDetails.ready);

Hooks.on("createCombat", function (data, delta) {
    //when combat is created, switch to combat tab
    if (game.user.isGM && setting("switch-combat-tab") && ui.sidebar.activeTab !== "combat")
        ui.sidebar.activateTab("combat");
});

Hooks.on("deleteCombat", function (combat) {
    MonksCombatDetails.tracker = false;   //if the combat gets deleted, make sure to clear this out so that the next time the combat popout gets rendered it repositions the dialog

    //if there are no more combats left, then close the combat window
    if (game.combats.combats.length == 0 && game.settings.get("monks-combat-details", 'close-combat-when-done')) {
        const tabApp = ui["combat"];
        if (tabApp._popout != undefined) {
            MonksCombatDetails.closeCount = 0;
            MonksCombatDetails.closeTimer = setInterval(function () {
                MonksCombatDetails.closeCount++;
                const tabApp = ui["combat"];
                if (MonksCombatDetails.closeCount > 100 || tabApp._popout == undefined) {
                    clearInterval(MonksCombatDetails.closeTimer);
                    return;
                }

                const states = tabApp?._popout.constructor.RENDER_STATES;
                if (![states.CLOSING, states.RENDERING].includes(tabApp?._popout._state)) {
                    tabApp?._popout.close();
                    clearInterval(MonksCombatDetails.closeTimer);
                }
            }, 100);
        }
    }
});

Hooks.on("updateCombat", async function (combat, delta) {
    MonksCombatDetails.checkPopout(combat, delta);
    /*
    let combatStarted = (combat && (delta.round === 1 && combat.turn === 0 && combat.started === true));

    //log("update combat", combat);
    let opencombat = setting("opencombat");

    //popout combat (if gm and opencombat is everyone or gm only), (if player and opencombat is everyone or players only and popout-combat)
    if (((game.user.isGM && ['everyone', 'gmonly'].includes(opencombat)) ||
        (!game.user.isGM && ['everyone', 'playersonly'].includes(opencombat) && game.settings.get("monks-combat-details", "popout-combat")))
        && combatStarted) {
		//new combat, pop it out
		const tabApp = ui["combat"];
		tabApp.renderPopout(tabApp);
		
        if (ui.sidebar.activeTab !== "chat")
            ui.sidebar.activateTab("chat");
    }

    if (combatposition() !== '' && delta.active === true) {
        //+++ make sure if it's not this players turn and it's not the GM to add padding for the button at the bottom
        MonksCombatDetails.tracker = false;   //delete this so that the next render will reposition the popout, changing between combats changes the height
    }*/
});

Hooks.on("createCombatant", async function (combatant, delta, userId) {
    MonksCombatDetails.checkPopout(combatant.combat, {active: true, bypass: true});
});

Hooks.on('closeCombatTracker', async (app, html) => {
    MonksCombatDetails.tracker = false;
});

Hooks.on('renderCombatTracker', async (app, html, data) => {
    if (!MonksCombatDetails.tracker && app.options.id == "combat" && app.options.popOut) {
        MonksCombatDetails.tracker = true;

        if (combatposition() !== '') {
            MonksCombatDetails.repositionCombat(app);
        }
    }

    if (!app.popOut && game.user.isGM && data.combat && !data.combat.started && setting('show-combat-cr') && MonksCombatDetails.xpchart != undefined) {
        //calculate CR
        let crdata = MonksCombatDetails.getCR(data.combat);

        if ($('#combat-round .encounter-cr-row').length == 0 && data.combat.combatants.size > 0) {
            let crChallenge = '';
            let epicness = '';
            let crText = '';
            if (game.system.id == 'pf2e') {
                crChallenge = MonksCombatDetails.crChallenge[Math.clamped(crdata.cr, 0, MonksCombatDetails.crChallenge.length - 1)];
                crText = 'XP Bud.: ' + crdata.xp;
            }
            else {
                crChallenge = MonksCombatDetails.crChallenge[Math.clamped(crdata.cr - crdata.apl, -1, 3) + 1];
                epicness = Math.clamped((crdata.cr - crdata.apl - 3), 0, 5);
                crText = 'CR: ' + MonksCombatDetails.getCRText(crdata.cr);
            }

            $('<nav>').addClass('encounters flexrow encounter-cr-row')
                .append($('<h4>').html(crText))
                .append($('<div>').addClass('encounter-cr').attr('rating', crChallenge.rating).html(i18n(crChallenge.text) + "!".repeat(epicness)))
                .insertAfter($('#combat .encounter-controls'));
        }
    }

    //don't show the previous or next turn if this isn't the GM
    if (!game.user.isGM && data.combat && data.combat.started) {
        $('.combat-control[data-control="previousTurn"],.combat-control[data-control="nextTurn"]:last').css({visibility:'hidden'});
    }

    if (app.options.popOut) {
        $(app.element).toggleClass("hide-defeated", setting("hide-defeated") == true);
    }
});

Hooks.on("renderSettingsConfig", (app, html, data) => {
    let btn = $('<button>')
        .addClass('file-picker')
        .attr('type', 'button')
        .attr('data-type', "imagevideo")
        .attr('data-target', "img")
        .attr('title', "Browse Files")
        .attr('tabindex', "-1")
        .html('<i class="fas fa-file-import fa-fw"></i>')
        .click(function (event) {
            const fp = new FilePicker({
                type: "audio",
                wildcard: true,
                current: $(event.currentTarget).prev().val(),
                callback: path => {
                    $(event.currentTarget).prev().val(path);
                }
            });
            return fp.browse();
        });

    let parent = $('input[name="monks-combat-details.next-sound"]', html).closest('.form-group');
    $('input[name="monks-combat-details.next-sound"]', html).css({ 'flex-basis': 'unset', 'flex-grow': 1 }).insertAfter($('input[name="monks-combat-details.play-next-sound"]', html));
    parent.remove();

    btn.clone(true).insertAfter($('input[name="monks-combat-details.next-sound"]', html));

    parent = $('input[name="monks-combat-details.turn-sound"]', html).closest('.form-group');
    $('input[name="monks-combat-details.turn-sound"]', html).css({'flex-basis': 'unset', 'flex-grow': 1}).insertAfter($('input[name="monks-combat-details.play-turn-sound"]', html));
    parent.remove();

    btn.clone(true).insertAfter($('input[name="monks-combat-details.turn-sound"]', html));

    parent = $('input[name="monks-combat-details.round-sound"]', html).closest('.form-group');
    $('input[name="monks-combat-details.round-sound"]', html).css({ 'flex-basis': 'unset', 'flex-grow': 1 }).insertAfter($('input[name="monks-combat-details.play-round-sound"]', html));
    parent.remove();

    btn.clone(true).insertAfter($('input[name="monks-combat-details.round-sound"]', html));

    //only show popout-combat if it's a player and it's available
    let opencombat = setting("opencombat");
    $('input[name="monks-combat-details.popout-combat"]', html).closest('.form-group').toggle(!game.user.isGM && ['everyone', 'playeronly'].includes(opencombat));

    $('<div>').addClass('form-group group-header').html(i18n("MonksCombatDetails.CombatPreparation")).insertBefore($('[name="monks-combat-details.prevent-initiative"]').parents('div.form-group:first'));
    $('<div>').addClass('form-group group-header').html(i18n("MonksCombatDetails.CombatDetails")).insertBefore($('[name="monks-combat-details.clear-targets"]').parents('div.form-group:first'));
    $('<div>').addClass('form-group group-header').html(i18n("MonksCombatDetails.CombatTracker")).insertBefore($('[name="monks-combat-details.switch-combat-tab"]').parents('div.form-group:first'));
    $('<div>').addClass('form-group group-header').html(i18n("MonksCombatDetails.CombatBars")).insertBefore($('[name="monks-combat-details.add-combat-bars"]').parents('div.form-group:first'));
    $('<div>').addClass('form-group group-header').html(i18n("MonksCombatDetails.CombatTurn")).insertBefore($('[name="monks-combat-details.shownextup"]').parents('div.form-group:first'));
});

Hooks.on("preUpdateToken", async function (document, data, options, userid) {
    let hp = getProperty(data, 'actorData.system.attributes.hp.value');
    let token = document.object;

    if (setting('auto-defeated') != 'none' && game.user.isGM) {
        if (hp != undefined && (setting('auto-defeated').startsWith('all') || document.disposition != 1)) {
            let combatant = document.combatant;

            //check to see if the combatant has been defeated
            let defeated = (setting('auto-defeated').endsWith('negative') ? hp < 0 : hp == 0);
            if (combatant != undefined && combatant.defeated != defeated) {
                await combatant.update({ defeated: defeated });
            }

            if (defeated && setting("invisible-dead")) {
                data.hidden = true;
            }
        }
    }

    if (hp != undefined) {
        token.refresh();
    }
});

Hooks.on("updateToken", async function (document, data, options, userid) {
    let hp = getProperty(data, 'actorData.system.attributes.hp.value');
    let token = document.object;

    if (hp != undefined) {
        token.refresh();
    }

    if (setting('auto-reveal') && game.user.isGM && data.hidden === false) {
        let combatant = document.combatant;

        if (combatant?.hidden === true) {
            await combatant.update({ hidden: false }).then(() => {
                token.refresh();
            });
        }
    }

    CombatBars.updateToken(document, data);
});

Hooks.on("updateCombatant", async function (combatant, data, options, userId) {
    const combat = combatant.parent;
    if (combat && combat.started && data.defeated != undefined && setting('auto-defeated') != 'none' && game.user.isGM) {
        let t = combatant.token
        const a = combatant.token.actor;

        let status = CONFIG.statusEffects.find(e => e.id === CONFIG.specialStatusEffects.DEFEATED);
        let effect = a && status ? status : CONFIG.controlIcons.defeated;
        const exists = (effect.icon == undefined ? (t.overlayEffect == effect) : (a.effects.find(e => e.getFlag("core", "statusId") === effect.id) != undefined));
        if (exists != data.defeated) {
            await t.object.toggleEffect(effect, { overlay: true, active: data.defeated });
            t.object.refresh();
        }
    }
});

Hooks.on("renderCombatTrackerConfig", (app, html, data) => {
    $('<div>').addClass("form-group")
        .append($('<label>').html("Hide Defeated?"))
        .append($('<input>').attr("type", "checkbox").attr("name", "hideDefeated").attr('data-dtype', 'Boolean').prop("checked", setting("hide-defeated") == true))
        .append($('<p>').addClass("notes").html("Automatically hide combatants marked as defeated?  Requires skip defeated."))
        .insertAfter($('input[name="skipDefeated"]', html).closest(".form-group"));

    app.setPosition({ height: 'auto' });
});

Hooks.on("preUpdateItem", (item, data, options, user) => {
    if (setting("prevent-combat-spells") != "false" && !game.user.isGM && user == game.user.id && getProperty(data, "system.preparation.prepared") != undefined) {
        //Is this actor involved in a combat
        let inCombat = game.combats.some(c => {
            return c.started && c.active && c.turns.some(t => t.actorId == item.actor.id);
        });

        if (inCombat) {
            if (setting("prevent-combat-spells") == "prevent") {
                ui.notifications.warn("Cannot change prepared spells while in combat");
                delete data.system.preparation.prepared;
                if (Object.keys(data.system.preparation).length == 0) delete data.system.preparation;
                if (Object.keys(data.system).length == 0) delete data.system;
                if (Object.keys(data).length == 0) return false;
            } else if (setting("prevent-combat-spells") == "true") {
                MonksCombatDetails.emit('spellChange', { user: game.user.id, actor: item.actor.id, name: item.name });
            }
        }
    }
});