
# WebMidi for Elm
**Web MIDI API for Elm language**

 Web MIDI API on [W3C](http://webaudio.github.io/web-midi-api/)

## Examples

1. [List MIDI Ports](examples/ListMIDIPorts.elm)
   Demonstrate how to request access to MIDI system.
   [DEMO](https://raw.githack.com/ibnHatab/WebMidi/master/demo/ListMIDIPorts.html)

```elm
  WebMidi.requestMIDIAccess defaultSettings
```

2. [Play a Note](examples/PlayNote.elm)

- Access MIDI sysbsystem
- Open Synch input port and associate it to output port via mailbox
- Send Event with encoded note to the mailbox
  [DEMO](https://raw.githack.com/ibnHatab/WebMidi/master/demo/PlayNote.html)

```elm
  synch = "Synth input port (16600:0)"

  WebMidi.requestMIDIAccess defaultSettings
           `andThen` \midi -> WebMidi.open (withDefault "none"
                                            (selectInstrument synch midi.outputs)) midiOut.signal
           `andThen` \p -> Signal.send midiOut.address (encodeChannelEvent c4on 0)

```
3. [Listent to input events from keyboard](examples/InputEventsFromKbd.elm)
- Open input port by name. Second argument is `WebMidi.channel` which
  is multiplexed input port for all instruments.
- Listen on all input events: channel and system. Those from system comming on predefined `WebMidi.system` port.
  [DEMO](https://raw.githack.com/ibnHatab/WebMidi/master/demo/InputEventsFromKbd.html)


```elm
  keyboard = "Virtual Keyboard"

  WebMidi.requestMIDIAccess defaultSettings
           `andThen` \midi ->
             WebMidi.open (withDefault "none" (selectInstrument keyboard midi.inputs)) WebMidi.channel


  main =
    Signal.map show (Signal.map2 (,) WebMidi.channel WebMidi.system)

```
4. [Perform music](examples/PerformMusic.elm)

- Eccess MIDI out port as in Ex. 2
- Chaine `WebMidi.jiffy` task which fetch current `performance.now()` time from browser.
- Use `jiffy` as time reference to serialize `track` of MIDI events usimg task sequencer
- Events `track` extracted from MIDI File structure which resemble
  MIDI Type 1 file with stream per instrument track list.

- Compose simple tune


```elm
cMaj = [c,e',g] |> List.map (\n -> n 4 hn)

cMajArp = Music.line  cMaj
cMajChd = Music.chord cMaj

tune : Music
tune = (Music.repeatM 3 cMajArp) :+: cMajChd

```

- Convert it to performance

```elm
ctx : Context
ctx = Context 0 AcousticGrandPiano 3 0

performance : Performance
performance = performM ctx tune

```

  [DEMO](https://raw.githack.com/ibnHatab/WebMidi/master/demo/PerformMusic.html)


## Start MIDI Synch on Linux

- Start JACK

> qjackcl &

- Add Virtual Keyboard

> vkeybd &

- Chose Synthetizer

> zynaddsubfx &

> qsynth &

.. or both

Link audio inputs an MIDI instruments in `qjackl` UI.

![Configure JACK connections](demo/MIDI-on-Linux.png)
