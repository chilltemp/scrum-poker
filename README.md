# Scrum / Planning Poker for Google Hangouts

## To Do
* Save user preferences
* Make Hangouts interface an Angular service
** Uses:
*** lodash
*** EventEmitter
* Alternate decks/cards
* Card back icons
** More
** Filter symbols that I use in the UI
* '$' breaks the build script

## "Build"
### Required
  npm install grunt
  npm install -g grunt-cli
  npm install
  download https://raw.githubusercontent.com/FortAwesome/Font-Awesome/master/src/icons.yml

### Commands
	grunt
	grunt watch

# Hangouts Service
## Events
* onApiReady
* update
* beforeAddParticipant
* participant state change events are their id prefixed by '!' 
* send custom events to all participants using hangout.sendEvent(key, value)

## Tips
* Whenever possible, link to scripts from a CDN.  Such as:
    * https://developers.google.com/speed/libraries/devguide
    * http://cdnjs.com
    * http://jsdelivr.com

