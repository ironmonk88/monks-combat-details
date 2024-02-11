import { MonksCombatDetails, i18n, log, debug, setting, patchFunc, getVolume } from "../monks-combat-details.js";

export class CombatTurn {
    static shadows = {};
    static sounds = {};

    static init() {
        //setTarget
        let combatNextTurn = async function (wrapped, ...args) {
            let current = canvas.tokens.get(game.combats.active?.current?.tokenId);

            if (current?.actor?.hasPlayerOwner && game.user.isGM) {
                // If the current combatant is a player, and the GM pressed next, then save the targets for the player
                for (let user of game.users) {
                    if (user.getFlag('monks-combat-details', 'remember-previous') && current?.actor.ownership[user.id] == CONST.DOCUMENT_OWNERSHIP_LEVELS.OWNER) {
                        let targets = Array.from(user.targets).map(t => t.id);
                        await user.setFlag('monks-combat-details', 'targets', targets);
                    }
                }
            } else if (current?.isOwner) {
                if (setting('remember-previous')) {
                    let targets = Array.from(game.user.targets).map(t => t.id);
                    log('saving targets, set target', current.name, targets);
                    if (game.user.isGM)
                        await current.document.setFlag('monks-combat-details', 'targets', targets);
                    else
                        await game.user.setFlag('monks-combat-details', 'targets', targets);
                }
            }

            return wrapped(...args);
        }

        patchFunc("Combat.prototype.nextTurn", combatNextTurn);

        Hooks.on("deleteCombatant", function (combatant, data, userId) {
            let combat = combatant.parent;
            CombatTurn.checkCombatTurn(combat);
        });

        Hooks.on("createCombatant", function (combatant, data, options) {
            let combat = combatant.parent;

            if (combatant.actor?.isOwner == true)
                CombatTurn.checkCombatTurn(combat);
        });

        Hooks.on("deleteCombat", function (combat) {
            if (setting('round-chatmessages') && combat && game.user.isTheGM && combat.started) {
                ChatMessage.create({ user: game.user, flavor: i18n("MonksCombatDetails.RoundEnd") }, { roundmarker: true });
            }

            if (combat && combat.started && setting('show-start')) {
                CombatTurn.clearShadows();
            }
        });

        /*
        Hooks.on("targetToken", async function (user, token, target) {
            if (setting('remember-previous')) {
                let current = canvas.tokens.get(game.combats.active?.current?.tokenId);

                if (current?.isOwner) {
                    let targets = Array.from(game.user.targets).map(t => t.id);
                    log('saving targets', current.name, targets, target);
                    if (game.user.isGM)
                        await current.document.setFlag('monks-combat-details', 'targets', targets);
                    else
                        await game.user.setFlag('monks-combat-details', 'targets', targets);
                }
            }
        });*/

        Hooks.on("updateCombat", async function (combat, delta) {
            if (combat.round == combat._mld_round && combat.turn == combat._mld_turn)
                return;

            if (delta.turn != undefined)
                CombatTurn.checkCombatTurn(combat);

            let combatStarted = (combat && (delta.round === 1 && combat.turn === 0 && combat.started === true));
            
            if (combat && combat.started && setting('clear-targets')) {
                let previous = canvas.tokens.get(combat?.previous?.tokenId);
                if (previous?.isOwner) {
                    //clear the targets
                    game.user.targets.forEach(t => t.setTarget(false, { user: game.user, releaseOthers: true, groupSelection: false }));

                    canvas.tokens.selectObjects({
                        x: 0,
                        y: 0,
                        height: 0,
                        releaseOptions: {},
                        controlOptions: { releaseOthers: true, updateSight: true }
                    });
                }
            }

            if (combat && combat.started && combat?.combatant?.token?.isOwner && setting('select-combatant')) {
                combat?.combatant?.token?._object?.control();
            }

            if (combat && combat.started && game.user.isGM && setting("pan-to-combatant") && combat?.combatant?.token) {
                if (canvas.dimensions.rect.contains(combat?.combatant?.token.x, combat?.combatant?.token.y)) {
                    canvas.animatePan({ x: combat?.combatant?.token.x, y: combat?.combatant?.token.y });
                }
            }

            if (combat && combat.started && setting('remember-previous') && combat?.combatant?.token?.isOwner) {
                let targets = [];
                if (game.user.isGM)
                    targets = combat.combatant.token.getFlag('monks-combat-details', 'targets');
                else
                    targets = game.user.getFlag('monks-combat-details', 'targets');

                log('loading targets', combat?.combatant?.token?.name, targets);
                if (targets && targets.length > 0) {
                    // release all current targets
                    for (let t of game.user.targets) {
                        t.setTarget(false, { user: game.user, releaseOthers: false, groupSelection: true });
                    }
                    // Select the previous targets
                    for (let id of targets) {
                        let token = canvas.tokens.get(id);
                        if (token
                            && !token.hidden
                            && !((token?.combatant && token?.combatant.defeated) || token.actor?.statuses.has(CONFIG.specialStatusEffects.DEFEATED) || token.document.overlayEffect == CONFIG.controlIcons.defeated))
                            token.setTarget(true, { user: game.user, releaseOthers: false, groupSelection: false });
                    }
                }
            }

            if (combat && combat.started && setting('show-start')) {
                CombatTurn.clearShadows();
            }

            if (setting('round-chatmessages') && combat && game.user.isTheGM) {
                if (combatStarted) {
                    ChatMessage.create({ user: game.user, flavor: i18n("MonksCombatDetails.RoundStart") }, { roundmarker: true });
                } else if (Object.keys(delta).some((k) => k === "round")) {
                    await ChatMessage.create({ user: game.user, flavor: `${i18n("MonksCombatDetails.Round")} ${delta.round}` }, { roundmarker: true });
                }
            }

            if (setting('play-round-sound') && setting('round-sound') && Object.keys(delta).some((k) => k === "round")) {
                CombatTurn.playTurnSounds(combat, 'round');
            }

            if (combat && combat.started && (delta.round || delta.turn) && setting('auto-scroll')) {
                $(`#sidebar #combat-tracker li[data-combatant-id="${combat.current.combatantId}"]`).each(function () {
                    $(this).parent().scrollTop(Math.max(this.offsetTop, 0)); // - $(this).height()
                });
                $(`#combat-popout #combat-tracker li[data-combatant-id="${combat.current.combatantId}"]`).each(function () {
                    $(this).parent().scrollTop(Math.max(this.offsetTop - $('#combat-popout .combat-tracker-header').height() - 32, 0)); // - $(this).height()
                    //this.scrollIntoView({ behavior: "smooth" });
                });
            }

            combat._mld_round = combat.round;
            combat._mld_turn = combat.turn;
        });

        Hooks.on("updateCombatant", async function (combatant, data, options, userId) {
            const combat = combatant.parent;

            if (combat && combat.started && combatant.actor?.isOwner && data.defeated != undefined) {
                CombatTurn.checkCombatTurn(combat);
            }
        });

        Hooks.on("createChatMessage", (message, options, user) => {
            if (options.roundmarker && game.user.isGM) {
                message.setFlag('monks-combat-details', 'roundmarker', true);
            }
        });

        Hooks.on("renderChatMessage", (message, html, data) => {
            if (message.getFlag('monks-combat-details', 'roundmarker')) {
                html.addClass('round-marker');
            }
        });

        Hooks.on("preUpdateToken", (document, update, options, userId) => {
            if (setting('show-start') && 
                document.combatant?.combat?.started && 
                (update.x != undefined || update.y != undefined) && 
                !MonksCombatDetails.isDefeated(document._object))
            {
                if (CombatTurn.shadows[document.id] == undefined)
                    CombatTurn.showShadow(document.object, document.object.x, document.object.y);
                
                MonksCombatDetails.emit('showShadows', { uuid: document.uuid, x: document.object.x, y: document.object.y });
            }
        })

        Hooks.on("updateToken", async (document, update, options, userId) => {
            if (setting('show-start')
                && document.combatant?.combat?.started
                && (update.x != undefined || update.y != undefined)
                && CombatTurn.shadows[document.id] != undefined
                && !MonksCombatDetails.isDefeated(document._object))
            {
                let shadow = CombatTurn.shadows[document.id];
                if (shadow && document.x == shadow._startX && document.y == shadow._startY) {
                    CombatTurn.removeShadow(document.id);
                    MonksCombatDetails.emit('removeShadow', { id: document.id });
                }
            }
        })

        Hooks.on("sightRefresh", function () {
            for (let [id, shadow] of Object.entries(CombatTurn.shadows)) {
                if (shadow) {
                    let token = canvas.tokens.get(id);
                    if (token) {
                        shadow.visible = game.user.isGM || token.isOwner;
                    }
                }
            }
        });
    }

    static async showShadow(token, x, y) {
        //create a shadow
        if (token.document.hidden && !game.user.isGM) return;

        let shadow = new PIXI.Container();
        canvas.grid.shadows.addChild(shadow);
        let colorMatrix = new PIXI.filters.ColorMatrixFilter();
        colorMatrix.sepia(0.6);
        shadow.filters = [colorMatrix];
        shadow.x = x + (token.w / 2);
        shadow.y = y + (token.h / 2);
        shadow.alpha = 0.5;
        shadow.angle = token.document.rotation;

        let width = token.w * token.document.texture.scaleX;
        let height = token.h * token.document.texture.scaleY;

        let tokenImage = await loadTexture(token.document.texture.src || "icons/svg/mystery-man.svg")
        let sprite = new PIXI.Sprite(tokenImage)
        sprite.x = -(token.w / 2) - (width - token.w) / 2;
        sprite.y = -(token.h / 2) - (height - token.h) / 2;
        if (token.mirrorX) {
            sprite.scale.x = -1;
            sprite.anchor.x = 1;
        }
        if (token.mirrorY) {
            sprite.scale.y = -1;
            sprite.anchor.y = 1;
        }

        sprite.width = width;
        sprite.height = height;
        shadow.addChild(sprite);
        shadow._startX = x;
        shadow._startY = y;

        shadow.visible = game.user.isGM || token.isOwner;

        CombatTurn.shadows[token.id] = shadow;
    }

    static ready() {
        game.settings.settings.get("monks-combat-details.play-turn-sound").default = !game.user.isGM; //(game.user.isGM ? 0 : 60); //set the default when we have the users loaded
        game.settings.settings.get("monks-combat-details.play-next-sound").default = !game.user.isGM;
        game.settings.settings.get("monks-combat-details.clear-targets").default = game.user.isGM;

        game.user.setFlag('monks-combat-details', 'remember-previous', setting("remember-previous"));

        if (setting("large-print")) {
            $("<div>").attr("id", "your-turn").appendTo('body');
        }
    }

    static removeShadow(id) {
        if (CombatTurn.shadows[id] == undefined) return;
        CombatTurn.shadows[id].destroy();
        delete CombatTurn.shadows[id];
    }

    static clearShadows() {
        for (let shadow of Object.values(CombatTurn.shadows))
            shadow.destroy();
        CombatTurn.shadows = {};
    }

    static doDisplayTurn(combatant) {
        if (setting("showcurrentup") && !game.user.isGM) {
            let msg = setting("turn-message");

            let context = {
                combatant
            };

            const compiled = Handlebars.compile(msg);
            msg = compiled(context, { allowProtoMethodsByDefault: true, allowProtoPropertiesByDefault: true }).trim();

            if (setting("large-print")) {
                $('#your-turn').addClass("current").removeClass("next").html(msg).addClass("show");
                window.setTimeout(() => { $("#your-turn").removeClass("show current"); }, 2000);
            } else
                ui.notifications.warn(msg);
        } 

        // play a sound
        if (setting('play-turn-sound') && setting('turn-sound') != '') {
            CombatTurn.playTurnSounds(combatant.combat, 'turn');
        }
    }

    static doDisplayNext(combatant) {
        if (setting("shownextup") && !game.user.isGM) {
            let msg = setting("nextup-message");

            let context = {
                combatant
            };

            const compiled = Handlebars.compile(msg);
            msg = compiled(context, { allowProtoMethodsByDefault: true, allowProtoPropertiesByDefault: true }).trim();

            if (setting("large-print")) {
                $('#your-turn').addClass("next").removeClass("current").html(msg).addClass("show");
                window.setTimeout(() => { $("#your-turn").removeClass("show next"); }, 2000);
            } else 
                ui.notifications.info(msg);
        }
        // play a sound
        if (setting('play-next-sound') && setting('next-sound') != '') {
            CombatTurn.playTurnSounds(combatant.combat, 'next');
        }
    }

    /**
    * Check if the current combatant needs to be updated
    */
    static checkCombatTurn(combat) {
        debug('checking combat started', combat, combat?.started);
        if (combat && combat.started) {
            let entry = combat.combatant;

            if (entry == undefined) return;

            let findNext = function (from) {
                let next = null;
                if (skip) {
                    for (let [i, t] of combat.turns.entries()) {
                        if (i <= from ||
                            t.defeated ||
                            t.actor?.statuses.has(CONFIG.specialStatusEffects.DEFEATED)) continue;
                        next = i;
                        break;
                    }
                }
                else next = from + 1;

                return next;
            }

            // Determine the next turn number
            let skip = combat.settings.skipDefeated;
            let next = findNext(combat.turn);
            //if there wasn't one next after the current player, then start back at the beginning and try to find the next one
            if (next == undefined || next >= combat.turns.length)
                next = findNext(-1);

            let isActive = entry?.actor?.isOwner;
            let nextentry = null;
            let isNext = false;

            if (next != null) {
                nextentry = combat.turns[next];
                isNext = nextentry.actor?.isOwner; //_id === game.users.current.character?._id;
            }

            debug('Check combat turn', entry?.name, nextentry?.name, !game.user.isGM, isActive, isNext, entry, nextentry);
            if (isActive) {
                if (combat._mcd_yourturn != entry._id) {
                    CombatTurn.doDisplayTurn(entry);
                }
            } else if (isNext) {
                if (game.modules.get("hidden-initiative")?.active && combat.round == 1 && !game.user.isGM)  //If hidden initiatives is active, then don't show up next information
                    return;

                if (combat._mcd_nextturn != nextentry._id) {
                    CombatTurn.doDisplayNext(nextentry);
                }
            }

            combat._mcd_yourturn = entry?._id;
            combat._mcd_nextturn = nextentry?._id
        }
    }

    static async playTurnSounds(combat, turn) {
        const audiofiles = await CombatTurn.getTurnSounds(turn);

        //audiofiles = audiofiles.filter(i => (audiofiles.length === 1) || !(i === this._lastWildcard));
        if (audiofiles.length > 0) {
            const audiofile = audiofiles[Math.floor(Math.random() * audiofiles.length)];

            let volume = (setting('volume') / 100) * getVolume();
            AudioHelper.play({ src: audiofile, volume: volume }).then((sound) => {
                combat.turnsound = sound;
                combat.turnsound.on("stop", () => {
                    delete combat.turnsound;
                });
                combat.turnsound.on("end", () => {
                    delete combat.turnsound;
                });
                combat.turnsound.effectiveVolume = volume;
            });
        }
    }

    static async getTurnSounds(turn) {
        const audiofile = setting(`${turn}-sound`);

        if (!audiofile.includes('*')) return [audiofile];
        if (CombatTurn.sounds[turn]) return CombatTurn.sounds[turn];
        let source = "data";
        let pattern = audiofile;
        const browseOptions = { wildcard: true };

        // Support S3 matching
        if (/\.s3\./.test(pattern)) {
            source = "s3";
            const { bucket, keyPrefix } = FilePicker.parseS3URL(pattern);
            if (bucket) {
                browseOptions.bucket = bucket;
                pattern = keyPrefix;
            }
        }

        // Retrieve wildcard content
        try {
            const content = await FilePicker.browse(source, pattern, browseOptions);
            CombatTurn.sounds[turn] = content.files;
        } catch (err) {
            CombatTurn.sounds[turn] = [];
            ui.notifications.error(err);
        }
        return CombatTurn.sounds[turn];
    }
}

Hooks.on("drawGridLayer", function (layer) {
    layer.shadows = layer.addChildAt(new PIXI.Container(), layer.getChildIndex(layer.borders));
});

Hooks.on("globalAmbientVolumeChanged", (volume) => {
    if (!game.modules.get("monks-sound-enhancements")?.active) {
        for (let combat of game.combats) {
            if (combat.active && combat.turnsound) {
                if (combat.turnsound.effectiveVolume != undefined) {
                    combat.turnsound.volume = volume * (combat.turnsound.effectiveVolume ?? 1);
                }
            }
        }
    }
});

Hooks.on("globalSoundEffectVolumeChanged", (volume) => {
    for (let combat of game.combats) {
        if (combat.active && combat.turnsound) {
            if (combat.turnsound.effectiveVolume != undefined) {
                combat.turnsound.volume = volume * (combat.turnsound.effectiveVolume ?? 1);
            }
        }
    }
});