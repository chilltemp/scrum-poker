# Scrum / Planning Poker for Google Hangouts

## To Do
* Stack cards when someone changes their mind.  Show prior number 
** Added, needs formatting
* Per user: colors, card back (unicode char)
* Flip cards: http://davidwalsh.name/css-flip
* Convert perl merge script to node.js

## "Build"
### Required
    npm install js-yaml
    npm install cli
    https://raw.githubusercontent.com/FortAwesome/Font-Awesome/master/src/icons.yml

### Commands
	node make.js; perl merge.pl scrum-poker; cp -r . ~/Google\ Drive/hangouts/scrumPoker; cp scrum-poker.xml /Volumes/myfiles.messagingengine.com/hangouts/scrum-poker-dev.xml 

