# jibo-cli

Command line tool for developing Jibo skills.

## Installation (non-contributing)
1. `npm install -g jibo-cli`
2. type `jibo` at a command/terminal prompt to see usage notes

## Contributing
**These steps are only for devs who are going to contribute to the repo.**

NOTE: Most of the logic for the cli is implemented in `jibo-tools`, which is separated out so that the Jibo Atom Package (`jibo-sdk`) can also expose the same functionality via it's UI.

To work on `jibo-cli` locally:

```
//clone the repo
git clone git+ssh://git@github.jibo.com:sdk/jibo-cli.git

//go into its root directory
cd jibo-cli

//build
npm install
gulp debug

//create a symlink
npm link .
```

Iterate on the code, and when you run `jibo` in the command line, it will use your work-in-progress code.
