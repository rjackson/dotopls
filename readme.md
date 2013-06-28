Very hacky code.  Pls no judge.


Dependencies:
- [steam](http://github.com/seishun/node-steam) - get 0.5.6 from github, it is not yet on npm.
- [vdf](https://npmjs.org/package/vdf)
- [deferred](https://npmjs.org/package/deferred)
- [protobuf](https://npmjs.org/package/protobuf)


`npm install` should install these automagically.


You'll have to edit PAGES in sort.js for the account you intend to use this on, cuz I haven't added logic to grab that automagically yet.  If you're porting this to another game, you'll need to edit COLUMNS and ROWS too.