# Monk's Combat Details
A bunch of quality of life things to make running combat a little easier.  Including turn notification, combat automations, combat tracker upgrades, and token status bars specifically for combat.

## Installation
Simply use the install module screen within the FoundryVTT setup

## Usage & Current Features
### Turn notifications
During combat the player will receive an on screen alert notification, and sound effect when their turn is up next, and another one when it's their turn to move.  The sound being played can be customised, and individual users can opt out of receiving the sound effect.  By default this is turned off for the GM but it can be turned on.

You can also have it display in a large animated format in case you have players that need something a little less subtle.

![monks-combat-details](/screenshots/your-turn.png)

### Combat Encounter Automation
When a combat is created, Monk's Combat Details can automatically switch you to the combat tab so you can configure details of the combat.  And when the combat is started it can automatically pop out the combat tracker, and switch back to the chat tab.  When the combat is complete, it can also automatically close the popout window.

You can also have the current creature on the combat tracker always displayed.  So if you have a long list of combatants, Monk's Combat Details will scroll the view so that they're in view.

### Strict combat requirements
Monk's Combat Details will warn you if you attempt to start a combat when not all tokens have rolled initiave.  You can always choose to ignore this message but it will prevent last minute corrctions of initiative.

You can also set it so that tokens can't be removed from combat using the token HUD.  This way if you accidentally click the wrong button on the HUD you don't have to remember where they were in combat.  You can still remove tokens from the combat via the Combat Tracker.

And if a player attempts to change their prepared spells in the middle of combat, you can either prevent the action, or have the GM sent a private message letting you know what player and what spell was changed.

### Creatures on the combat tracker
You can also hide creatures from players while you are creating the encounter.  That way they won't know what's in store for them until battle starts.  You can also set this up so that enemies aren't revealed in the combat tracker until they've had their first turn.  And when an enemy is defeated, you can have it hidden from the player to keep the field of combat clean.

### Automatic creature status
Monk's Combat Details can also automatically set the status of a creature to defeated once they reach zero HP.

And if the token is invisible when the combat is started, and hidden on the combat track, when the token is revealed during combat, Monk's Combat Details will reveal the token on combat tracker.

### Combat status bars
You can turn on a feature to display a different set of token status bars while the token is in combat.  For example, if you don't want to see the hp of a token while they are in exploration mode, but want to see their hp in combat when it's important, you can turn this feature on.

### Show Combat CR
Display the calculated CR of the Encounter.  This should give you a clue if the encounter might be scaled too hard for the current party.  Not 100% accurate but enough for a good idea.

![monks-combat-details](/screenshots/ShowCombatCR.webp)

### Combat Turn automation
After your turn is over, you can have your current target removed.  This prevents you from accidentally applying effects to the last target.  Monk's Combat Details will remember the last target you picked on your turn though and can re-target the token once you have your turn again.

For the GM you can have the current combatant automatically selected once it has its turn.

And you can also have the screen pan to the controlled token when your turn starts, in case you forgot where it was.

### Show starting location
Monk's Combat Details will show an icon fromt he starting position of the token who moved in combat.  This way you're not left wondering where your starting square in case you moved the token, but changed your mind.

![monks-combat-details](/screenshots/PreviousPosition.gif)

### Combat Round Message
When the round changes, display a message int he chat window.  That way if you are trackign how long an effect last you can easily count how many rounds it's been since it was started.

![monks-combat-details](/screenshots/CombatRound.png)

## Monk's Little Details

This feature was previously part of the Monk's Little Details module, but was split out so that the modules were easier to maintain and could concentrate on the function they did best.

## Bug Reporting
Please feel free to contact me on discord if you have any questions or concerns. ironmonk88#4075

## Support

If you feel like being generous, stop by my <a href="https://www.patreon.com/ironmonk">patreon</a>.

Or [![ko-fi](https://ko-fi.com/img/githubbutton_sm.svg)](https://ko-fi.com/R6R7BH5MT)

Not necessary but definitely appreciated.

## License
This Foundry VTT module, writen by Ironmonk, is licensed under [GNU GPLv3.0](https://www.gnu.org/licenses/gpl-3.0.en.html), supplemented by [Commons Clause](https://commonsclause.com/).

This work is licensed under Foundry Virtual Tabletop <a href="https://foundryvtt.com/article/license/">EULA - Limited License Agreement for module development from May 29, 2020.</a>
