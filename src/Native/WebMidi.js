Elm.Native.WebMidi = {};
Elm.Native.WebMidi.make = function(localRuntime) {

    localRuntime.Native = localRuntime.Native || {};
    localRuntime.Native.WebMidi = localRuntime.Native.WebMidi || {};

    if (localRuntime.Native.WebMidi.values)
    {
	return localRuntime.Native.WebMidi.values;
    }

    var Dict = Elm.Dict.make(localRuntime);
    var Task = Elm.Native.Task.make(localRuntime);
    var Signal = Elm.Native.Signal.make(localRuntime);
    var Port = Elm.Native.Port.make(localRuntime);
    var Tuple2 = Elm.Native.Utils.make(localRuntime).Tuple2;

    // PRIVATE DATA
    // global MIDIAccess object
    var midi = null;
    // List of valid channel MIDI messages and matching value
    var _channelMessages = {
        "noteoff": 0x8,           // 8
        "noteon": 0x9,            // 9
        "keyaftertouch": 0xA,     // 10
        "controlchange": 0xB,     // 11
        "channelmode": 0xB,       // 11
        "programchange": 0xC,     // 12
        "channelaftertouch": 0xD, // 13
        "pitchbend": 0xE          // 14
    };
    // List of valid system MIDI messages and matching value (249 and 253 are actually
    // dispatched by the Web MIDI API but I do not know what they are for and they are not
    // part of the online MIDI 1.0 spec. (http://www.midi.org/techspecs/midimessages.php)
    var _systemMessages = {
        "sysex": 0xF0,            // 240
        "timecode": 0xF1,         // 241
        "songposition": 0xF2,     // 242
        "songselect": 0xF3,       // 243
        "tuningrequest": 0xF6,    // 246
        "sysexend": 0xF7,         // 247 (never actually received - simply ends a sysex)
        "clock": 0xF8,            // 248
        "start": 0xFA,            // 250
        "continue": 0xFB,         // 251
        "stop": 0xFC,             // 252
        "activesensing": 0xFE,    // 254
        "reset": 0xFF,            // 255
        "unknownsystemmessage": -1
    };
    // -------------------
    function requestMIDIAccess (settings) {
        return Task.asyncFunction(function(callback) {

            if (! ("requestMIDIAccess" in navigator)) {
                console.error('No Web MIDI support')
                return callback(Task.fail(new Error('No Web MIDI support')));
            }

            function onMIDISuccess (midiAccess) {
                midi = midiAccess;

                var elmMidiAccess =  {
                    _: {},
                    inputs: Dict.empty,
                    outputs: Dict.empty,
                    sysexEnabled: midiAccess.sysexEnabled
                }

                midiAccess.inputs.forEach(function(port){
                    var value = { ctor: 'MIDIPort', _0: port.name,
                                  _1:  port.manufacturer, _2: port.version }
                    elmMidiAccess.inputs =
                        A3(Dict.insert, port.id, value, elmMidiAccess.inputs);
                });

                midiAccess.outputs.forEach(function(port){
                    var value = { ctor: 'MIDIPort', _0: port.name,
                                  _1:  port.manufacturer, _2: port.version }
                    elmMidiAccess.outputs =
                        A3(Dict.insert, port.id, value, elmMidiAccess.outputs);
                });

		// MIDI device connect/disconnect
		if (settings.onChange.ctor === 'Just')
		{
                    midiAccess.onstatechange = function(event) {
			var task = settings.onChange._0(event.port.id);
			Task.spawn(task);
		    };
	        }

                return callback(Task.succeed(elmMidiAccess))
            }

            navigator.requestMIDIAccess({
                sysex: settings.sysex
            }).then(onMIDISuccess, function(error) {
		return callback(Task.fail(new Error('No Web MIDI support')));
	    });
        })};


    function open (id, signal) {
        return Task.asyncFunction(function(callback) {
            var dev = midi.inputs.get(id) || midi.outputs.get(id);
            dev.open().then(
                function(port) {
                    if(port.type === "output") {
                        var midiOut = Port.outboundSignal("midiOut-" + signal.name,
                                                          function (v) {
                                                              return {noteOn: v.noteOn
                                                                      ,pitch: v.pitch
                                                                      ,velocity: v.velocity
                                                                      ,timestamp: v.timestamp
                                                                      ,channel: v.channel};
                                                          },
                                                          signal);

                        var midiOutSignal = localRuntime.ports["midiOut-" + signal.name];

                        midiOutSignal.subscribe(function(note) {
                            console.log(note);
                            port.send([ 0x90, 0x45, 0x7f ] );
                        });
                    } else if (port.type === "input") {
                        port.onmidimessage = function(event) {
                            if (event.data[0] < 240) {      // device and channel-specific message
                                // _parseChannelEvent(e);
                                noteDecode(event);
                            } else if (e.data[0] <= 255) {  // system message
                                console.log("TODO: parse " + event);
                                // _parseSystemEvent(e);
                            }

                            var note = noteDecode(event);
                            localRuntime.notify(signal.id, note)
                        }
                    }

                    return callback(Task.succeed(port))
                },
                function(error) {
                    return callback(Task.fail(error))
                } );
        });
    }

    function close (id) {
        return Task.asyncFunction(function(callback) {

        });
    }

    // Encode ELM MidiNote to MIDI Message
    function noteEncode (mote) {

    }

    // Decode event
    // Taken from https://github.com/cotejp/webmidi/blob/master/src/webmidi.js
    function noteDecode (e) {
        var command = e.data[0] >> 4;
        var channel = (e.data[0] & 0xf) + 1;
        var data1, data2;

        if (e.data.length > 1) {
            data1 = e.data[1];
            data2 = e.data.length > 2 ? e.data[2] : undefined;
        }

        var noteoff = command === _channelMessages.noteoff ||
            (command === _channelMessages.noteon && data2 === 0);


        return { _ : {},
                 noteOn: ! noteoff,
                 pitch: Tuple2(data1 % 12, Math.floor(data1 / 12 - 1) - 3),
                 timestamp: e.receivedTime,
                 velocity: data2 / 127,
                 channel: channel
               };
    }

    var performance = Signal.input('WebMidi.performance', function () {
        console.error("FIXME")
        performance.now()});

    return localRuntime.Native.WebMidi.values = {
        requestMIDIAccess: requestMIDIAccess,
        open: F2(open),
        close: close,
        performance: performance
    };
};
