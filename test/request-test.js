var assert = require('assert');
var utils = require('./testutils');
var Request = utils.load_module('request').Request;
var Remote = utils.load_module('remote').Remote;
var Server = utils.load_module('server').Server;

function makeServer(url) {
  var server = new Server(new process.EventEmitter(), url);
  server._connected = true;
  return server;
};

const SERVER_INFO = {
  "info": {
    "build_version": "0.25.2-rc1",
    "complete_ledgers": "32570-7016339",
    "hostid": "LIED",
    "io_latency_ms": 1,
    "last_close": {
      "converge_time_s": 2.013,
      "proposers": 5
    },
    "load_factor": 1,
    "peers": 42,
    "pubkey_node": "n9LpxYuMx4Epz4Wz8Kg2kH3eBTx1mUtHnYwtCdLoj3HC85L2pvBm",
    "server_state": "full",
    "validated_ledger": {
      "age": 0,
      "base_fee_xrp": 0.00001,
      "hash": "E43FD49087B18031721D9C3C4743FE1692C326AFF7084A2C01B355CE65A4C699",
      "reserve_base_xrp": 20,
      "reserve_inc_xrp": 5,
      "seq": 7016339
    },
    "validation_quorum": 3
  }
};

describe('Request', function() {
  it('Send request', function(done) {
    var remote = {
      request: function(req) {
        assert(req instanceof Request);
        assert.strictEqual(typeof req.message, 'object');
        assert.strictEqual(req.message.command, 'server_info');
        done();
      }
    };

    var request = new Request(remote, 'server_info');

    request.request();
  });

  it('Broadcast request', function(done) {
    var servers = [
      makeServer('wss://localhost:5006'),
      makeServer('wss://localhost:5007')
    ];

    var requests = 0;

    servers.forEach(function(server, index, arr) {
      server._request = function(req) {
        assert(req instanceof Request);
        assert.strictEqual(typeof req.message, 'object');
        assert.strictEqual(req.message.command, 'server_info');
        if (++requests === arr.length) {
          done();
        }
      };
    });

    var remote = new Remote();
    remote._connected = true;
    remote._servers = servers;

    var request = new Request(remote, 'server_info');

    request.broadcast();
  });

  it('Events API', function(done) {
    var server = makeServer('wss://localhost:5006');

    server._request = function(req) {
      assert(req instanceof Request);
      assert.strictEqual(typeof req.message, 'object');
      assert.strictEqual(req.message.command, 'server_info');
      req.emit('success', SERVER_INFO);
    };

    var remote = new Remote();
    remote._connected = true;
    remote._servers = [ server ];

    var request = new Request(remote, 'server_info');

    request.once('success', function(res) {
      assert.deepEqual(res, SERVER_INFO);
      done();
    });

    request.request();
  });

  it('Callback API', function(done) {
    var server = makeServer('wss://localhost:5006');

    server._request = function(req) {
      assert(req instanceof Request);
      assert.strictEqual(typeof req.message, 'object');
      assert.strictEqual(req.message.command, 'server_info');
      req.emit('success', SERVER_INFO);
    };

    var remote = new Remote();
    remote._connected = true;
    remote._servers = [ server ];

    var request = new Request(remote, 'server_info');

    request.callback(function(err, res) {
      assert.ifError(err);
      assert.deepEqual(res, SERVER_INFO);
      done();
    });
  });

  it('Timeout', function(done) {
    var server = makeServer('wss://localhost:5006');
    var successEmited = false;

    server._request = function(req) {
      assert(req instanceof Request);
      assert.strictEqual(typeof req.message, 'object');
      assert.strictEqual(req.message.command, 'server_info');
      setTimeout(function() {
        successEmitted = true;
        req.emit('success', SERVER_INFO);
      }, 200);
    };

    var remote = new Remote();
    remote._connected = true;
    remote._servers = [ server ];

    var request = new Request(remote, 'server_info');

    request.timeout(10, function() {
      setTimeout(function() {
        assert(successEmitted);
        done();
      }, 200);
    });

    request.callback(function(err, res) {
      assert(false, 'Callback should not be called');
    });
  });

  it('Set server', function(done) {
    var servers = [
      makeServer('wss://localhost:5006'),
      makeServer('wss://localhost:5007')
    ];

    servers[1]._request = function(req) {
      assert(req instanceof Request);
      assert.strictEqual(typeof req.message, 'object');
      assert.strictEqual(req.message.command, 'server_info');
      done();
    };

    var remote = new Remote();
    remote._connected = true;
    remote._servers = servers;

    remote.getServer = function() {
      return servers[0];
    };

    var request = new Request(remote, 'server_info');
    request.setServer(servers[1]);

    assert.strictEqual(request.server, servers[1]);

    request.request();
  });

  it('Set build path', function() {
    var remote = new Remote();
    remote._connected = true;
    remote.local_signing = false;

    var request = new Request(remote, 'server_info');
    request.buildPath(true);
    assert.strictEqual(request.message.build_path, true);
  });

  it('Remove build path', function() {
    var remote = new Remote();
    remote._connected = true;
    remote.local_signing = false;

    var request = new Request(remote, 'server_info');
    request.buildPath(false);
    assert(!request.message.hasOwnProperty('build_path'));
  });

  it('Set build path with local signing', function() {
    var remote = new Remote();
    remote._connected = true;

    var request = new Request(remote, 'server_info');

    assert.throws(function() {
      request.buildPath(true);
    }, Error);
  });

  it('Set ledger hash', function() {
    var remote = new Remote();
    remote._connected = true;

    var request = new Request(remote, 'server_info');
    request.ledgerHash('B4FD84A73DBD8F0DA9E320D137176EBFED969691DC0AAC7882B76B595A0841AE');
    assert.strictEqual(request.message.ledger_hash, 'B4FD84A73DBD8F0DA9E320D137176EBFED969691DC0AAC7882B76B595A0841AE');
  });

  it('Set ledger index', function() {
    var remote = new Remote();
    remote._connected = true;

    var request = new Request(remote, 'server_info');
    request.ledgerIndex(7016915);
    assert.strictEqual(request.message.ledger_index, 7016915);
  });

  it('Select ledger (identifier)', function() {
    var remote = new Remote();
    remote._connected = true;

    var request = new Request(remote, 'server_info');
    request.ledgerSelect('validated');
    assert.strictEqual(request.message.ledger_index, 'validated');
  });

  it('Select ledger (index)', function() {
    var remote = new Remote();
    remote._connected = true;

    var request = new Request(remote, 'server_info');
    request.ledgerSelect(7016915);
    assert.strictEqual(request.message.ledger_index, 7016915);
  });

  it('Select ledger (hash)', function() {
    var remote = new Remote();
    remote._connected = true;

    var request = new Request(remote, 'server_info');
    request.ledgerSelect('B4FD84A73DBD8F0DA9E320D137176EBFED969691DC0AAC7882B76B595A0841AE');
    assert.strictEqual(request.message.ledger_hash, 'B4FD84A73DBD8F0DA9E320D137176EBFED969691DC0AAC7882B76B595A0841AE');
  });

  it('Select ledger (hash)', function() {
    var remote = new Remote();
    remote._connected = true;

    var request = new Request(remote, 'server_info');
    request.ledgerSelect('B4FD84A73DBD8F0DA9E320D137176EBFED969691DC0AAC7882B76B595A0841AE');
    assert.strictEqual(request.message.ledger_hash, 'B4FD84A73DBD8F0DA9E320D137176EBFED969691DC0AAC7882B76B595A0841AE');
  });

  it('Set offer ID', function() {
    var remote = new Remote();
    remote._connected = true;

    var request = new Request(remote, 'server_info');
    request.offerId('r9cZA1mLK5R5Am25ArfXFmqgNwjZgnfk59', 1337);
    assert.deepEqual(request.message.offer, {
      account: 'r9cZA1mLK5R5Am25ArfXFmqgNwjZgnfk59',
      seq: 1337
    });
  });

  it('Set offer index', function() {
    var remote = new Remote();
    remote._connected = true;

    var request = new Request(remote, 'server_info');
    request.offerIndex(1337);
    assert.strictEqual(request.message.offer, 1337);
  });

  it('Set secret', function() {
    var remote = new Remote();
    remote._connected = true;

    var request = new Request(remote, 'server_info');
    request.secret('mySecret');
    assert.strictEqual(request.message.secret, 'mySecret');
  });

  it('Set transaction hash', function() {
    var remote = new Remote();
    remote._connected = true;

    var request = new Request(remote, 'server_info');
    request.txHash('E08D6E9754025BA2534A78707605E0601F03ACE063687A0CA1BDDACFCD1698C7');
    assert.strictEqual(request.message.tx_hash, 'E08D6E9754025BA2534A78707605E0601F03ACE063687A0CA1BDDACFCD1698C7');
  });

  it('Set transaction JSON', function() {
    var remote = new Remote();
    remote._connected = true;

    var request = new Request(remote, 'server_info');
    var txJson = { hash: 'E08D6E9754025BA2534A78707605E0601F03ACE063687A0CA1BDDACFCD1698C7' };
    request.txJson(txJson);
    assert.deepEqual(request.message.tx_json, txJson);
  });

  it('Set transaction blob', function() {
    var remote = new Remote();
    remote._connected = true;

    var request = new Request(remote, 'server_info');
    request.txBlob('asdf');
    assert.strictEqual(request.message.tx_blob, 'asdf');
  });

  it('Set ripple state', function() {
    var remote = new Remote();
    remote._connected = true;

    var request = new Request(remote, 'server_info');
    request.rippleState('r9cZA1mLK5R5Am25ArfXFmqgNwjZgnfk59', 'r9cZA1mLK5R5Am25ArfXFmqgNwjZgnfk59', 'USD');
    assert.deepEqual(request.message.ripple_state, {
      currency: 'USD',
      accounts: [ 'r9cZA1mLK5R5Am25ArfXFmqgNwjZgnfk59', 'r9cZA1mLK5R5Am25ArfXFmqgNwjZgnfk59' ]
    });
  });

  it('Set accounts', function() {
    var remote = new Remote();
    remote._connected = true;

    var request = new Request(remote, 'server_info');
    request.accounts([
        'rLEsXccBGNR3UPuPu2hUXPjziKC3qKSBun',
        'rvYAfWj5gh67oV6fW32ZzP3Aw4Eubs59B'
    ]);

    assert.deepEqual(request.message.accounts, [
        'rLEsXccBGNR3UPuPu2hUXPjziKC3qKSBun',
        'rvYAfWj5gh67oV6fW32ZzP3Aw4Eubs59B'
    ]);
  });

  it('Set accounts proposed', function() {
    var remote = new Remote();
    remote._connected = true;

    var request = new Request(remote, 'server_info');
    request.accountsProposed([
        'rLEsXccBGNR3UPuPu2hUXPjziKC3qKSBun',
        'rvYAfWj5gh67oV6fW32ZzP3Aw4Eubs59B'
    ]);

    assert.deepEqual(request.message.accounts_proposed, [
        'rLEsXccBGNR3UPuPu2hUXPjziKC3qKSBun',
        'rvYAfWj5gh67oV6fW32ZzP3Aw4Eubs59B'
    ]);
  });

  it('Add account', function() {
    var remote = new Remote();
    remote._connected = true;

    var request = new Request(remote, 'server_info');

    request.accounts([
        'rLEsXccBGNR3UPuPu2hUXPjziKC3qKSBun',
    ]);

    request.addAccount('rvYAfWj5gh67oV6fW32ZzP3Aw4Eubs59B');

    assert.deepEqual(request.message.accounts, [
        'rLEsXccBGNR3UPuPu2hUXPjziKC3qKSBun',
        'rvYAfWj5gh67oV6fW32ZzP3Aw4Eubs59B'
    ]);
  });

  it('Add account proposed', function() {
    var remote = new Remote();
    remote._connected = true;

    var request = new Request(remote, 'server_info');

    request.accountsProposed([
        'rLEsXccBGNR3UPuPu2hUXPjziKC3qKSBun',
    ]);

    request.addAccountProposed('rvYAfWj5gh67oV6fW32ZzP3Aw4Eubs59B');

    assert.deepEqual(request.message.accounts_proposed, [
        'rLEsXccBGNR3UPuPu2hUXPjziKC3qKSBun',
        'rvYAfWj5gh67oV6fW32ZzP3Aw4Eubs59B'
    ]);
  });

  it('Set books', function() {
    var remote = new Remote();
    remote._connected = true;

    var request = new Request(remote, 'server_info');

    var books = [
      {
      "taker_gets": {
        "currency": "EUR",
        "issuer": "rvYAfWj5gh67oV6fW32ZzP3Aw4Eubs59B"
      },
      "taker_pays": {
        "currency": "USD",
        "issuer": "rvYAfWj5gh67oV6fW32ZzP3Aw4Eubs59B"
      }
    }
    ];

    request.books(books);

    assert.deepEqual(request.message.books, books);
  });

  it('Add book', function() {
    var remote = new Remote();
    remote._connected = true;

    var request = new Request(remote, 'server_info');

    var books = [
      {
        "taker_gets": {
          "currency": "EUR",
          "issuer": "rvYAfWj5gh67oV6fW32ZzP3Aw4Eubs59B"
        },
        "taker_pays": {
          "currency": "USD",
          "issuer": "rvYAfWj5gh67oV6fW32ZzP3Aw4Eubs59B"
        }
      }
    ];

    request.books(books);

    request.addBook({
      "taker_gets": {
        "currency": "CNY",
        "issuer": "rvYAfWj5gh67oV6fW32ZzP3Aw4Eubs59B"
      },
      "taker_pays": {
        "currency": "USD",
        "issuer": "rvYAfWj5gh67oV6fW32ZzP3Aw4Eubs59B"
      }
    });

    assert.deepEqual(request.message.books, [
      {
        "taker_gets": {
          "currency": "EUR",
          "issuer": "rvYAfWj5gh67oV6fW32ZzP3Aw4Eubs59B"
        },
        "taker_pays": {
          "currency": "USD",
          "issuer": "rvYAfWj5gh67oV6fW32ZzP3Aw4Eubs59B"
        }
      },

      {
        "taker_gets": {
          "currency": "CNY",
          "issuer": "rvYAfWj5gh67oV6fW32ZzP3Aw4Eubs59B"
        },
        "taker_pays": {
          "currency": "USD",
          "issuer": "rvYAfWj5gh67oV6fW32ZzP3Aw4Eubs59B"
        }
      }
    ]);
  });
});
