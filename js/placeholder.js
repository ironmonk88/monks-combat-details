import { MonksCombatDetails, i18n, log, debug, setting, patchFunc } from "../monks-combat-details.js";

export class PlaceholderCombatant {
    static init() {
        Hooks.on("renderCombatTracker", (app, html, data) => {
            if (game.user.isGM && !app.popOut && app.viewed) {
                $('<nav>').addClass("directory-footer flexrow add-placeholder").append(
                    $("<a>").html(`<i class="fa fa-plus"></i> ${i18n("MonksCombatDetails.AddPlaceholder")}`).on("click", PlaceholderCombatant.addPlaceholder.bind(this, app)))
                    .insertBefore($("#combat-controls", html));
            }

            if (app.viewed?.combatants) {
                for (let combatant of app.viewed?.combatants) {
                    if (combatant.getFlag("monks-combat-details", "placeholder")) {
                        $(`.combatant[data-combatant-id="${combatant.id}"] .combatant-controls > *:not([data-control="toggleHidden"])`, html).remove();
                    }
                }
            }
        });

        Hooks.on("getCombatTrackerEntryContext", (html, menu) => {
            let idx = menu.findIndex(m => m.name == "COMBAT.CombatantUpdate") || 1;
            menu.splice(idx, 0,
                {
                    name: i18n("MonksCombatDetails.CreatePlaceholder"),
                    icon: '<i class="fas fa-user"></i>',
                    condition: li => {
                        let combatant = game.combats.viewed.combatants.get(li.data("combatant-id"));
                        return combatant && !combatant.getFlag("monks-combat-details", "placeholder");
                    },
                    callback: li => {
                        let combatant = game.combats.viewed.combatants.get(li.data("combatant-id"));
                        if (combatant) {
                            let combatantData = combatant.toObject();
                            combatant = new Combatant(combatantData);
                            delete combatant._id;
                            if (combatant.initiative)
                                combatant.initiative = combatant.initiative - 1;
                            combatant.name = combatant.name + " [Placeholder]"
                            new PlaceholderCombatantConfig(combatant).render(true);
                        }
                    }
                });
        });

        let CombatantInitiative = function (wrapped, ...args) {
            if (this.getFlag("monks-combat-details", "placeholder")) {
                return new CONFIG.Dice.D20Roll("1d20", {});
            }
            return wrapped(...args);
        }

        patchFunc("Combatant.prototype.getInitiativeRoll", CombatantInitiative, "MIXED");

        let ConfigureCombatant = function (wrapped, ...args) {
            let [li] = args;
            const combatant = this.viewed.combatants.get(li.data("combatant-id"));
            if (combatant?.getFlag("monks-combat-details", "placeholder")) {
                return new PlaceholderCombatantConfig(combatant, {
                    top: Math.min(li[0].offsetTop, window.innerHeight - 350),
                    left: window.innerWidth - 720
                }).render(true);
            }
            return wrapped(...args);
        }

        patchFunc("CombatTracker.prototype._onConfigureCombatant", ConfigureCombatant, "MIXED");
    }

    static addPlaceholder(app) {
        let combatant = new Combatant();
        delete combatant._id;
        if (app.viewed?.started && app.viewed?.combatant?.initiative) {
            combatant.initiative = app.viewed.combatant?.initiative - 1;
        }
        new PlaceholderCombatantConfig(combatant).render(true);
    }
}

export class PlaceholderCombatantConfig extends CombatantConfig {
    constructor(object, options) {
        super(object, options);
    }

    static get defaultOptions() {
        return mergeObject(super.defaultOptions, {
            id: "placeholder-combatant-form",
        });
    }

    activateListeners(html) {
        $(`input[name="defeated"]`, html).parent().remove();
    }

    async _updateObject(event, formData) {
        formData["flags.monks-combat-details.placeholder"] = true;
        if (!this.object._id) {
            formData.actorId = this.object.actorId;
            formData.tokenId = this.object.tokenId;
        }
        super._updateObject(event, formData);
    }
}