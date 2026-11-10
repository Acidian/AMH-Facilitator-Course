/* Course content (v3). Edit text here; app.js renders it. No build step.
 *
 * A unit plays as a run of short screens:
 *   intro -> learn screens -> "hold on to" -> try -> check(s) -> note -> done
 *
 * learn:  array of screens. Each is { h: 'Heading', p: 'Text' } and may add
 *         list: [...], script: 'spoken line', or w: '<widget>' plus widget data.
 * try:    { title, text | steps, w?: '<widget>' }
 * check:  array of parts: { kind: 'quiz', items } | { kind: 'scenario', nodes } |
 *         { kind: 'order', ... } | { kind: 'form', form } | { kind: 'confirm', label } |
 *         { kind: 'ready', requires }
 * act:    ACT processes the unit trains (lights up the ACT map).
 * track:  omit for everyone, or 'tourism' for the astro-tourism track only.
 *
 * Widgets: sort, spot, guests, hex, defuse, quiet, silence, rehearse, flag, walk.
 * Unit ids and form field ids are storage keys. Renaming them loses learners' saved work.
 */
window.COURSE = (() => {

const ACT = {
  present:    { label: 'Be present',      short: 'Present',         plain: 'Contact with this moment, through the senses.',               example: 'Noticing the taste of your coffee.',                         sky: 'The Five-Sense Landing' },
  acceptance: { label: 'Make room',       short: 'Acceptance',      plain: 'Letting feelings be there without fighting them.',            example: 'Letting nerves be there before a talk.',                     sky: 'The Sky Within' },
  defusion:   { label: 'Step back',       short: 'Defusion',        plain: 'Seeing a thought as a thought, not the whole truth.',         example: '"I am having the thought that I am a bad guide."',           sky: 'Placing Thoughts in the Sky' },
  self:       { label: 'The observer',    short: 'Self-as-context', plain: 'The part of you that notices, like the sky holding weather.', example: 'The part of you that notices you are nervous.',              sky: 'The Sky Within, The Pale Blue Dot' },
  values:     { label: 'What matters',    short: 'Values',          plain: 'Chosen directions you can steer by, like fixed stars.',       example: 'What you want to stand for as a guide.',                     sky: 'The Pale Blue Dot, Finding Your Guiding Stars' },
  action:     { label: 'Do what matters', short: 'Action',          plain: 'One small, concrete step toward a value.',                    example: 'One phone call you have been putting off.',                  sky: 'Finding Your Guiding Stars' }
};

const TRACKS = {
  core:    { label: 'Core facilitator',    text: 'For anyone who will run sky-based wellbeing sessions: schools, community groups, observatories, outreach.' },
  tourism: { label: 'Astro-tourism guide', text: 'Everything in Core, plus a unit on paying guests, night tours, ethics and marketing. Matches the in-person day.' }
};

const STAGES = [
  { id: 0, title: 'Start',       blurb: 'What this is, who it is for, and the line you hold.',                              art: '00-start' },
  { id: 1, title: 'Foundations', blurb: 'Mental health, trauma-informed practice, ACT, and why the sky works.',             art: '01-foundations' },
  { id: 2, title: 'Safety',      blurb: 'Boundaries, the warm hand-off, heavy moments, and looking after yourself.',        art: '02-safety' },
  { id: 3, title: 'Practice',    blurb: 'The opening script and the five sky activities, in order.',                        art: '03-practice' },
  { id: 4, title: 'Context',     blurb: 'Adapt to your sky, your people and your setting, then design your session.',       art: '04-context' },
  { id: 5, title: 'Go',          blurb: 'Run your first session and reflect on it.',                                        art: '05-go' }
];

/* Forms are shared with the printed workbook (page refs in `workbook`). */
const FORMS = {
  scope: {
    title: 'Your scope statement', workbook: null,
    fields: [
      { id: 'sentence', label: 'Describe your session in one sentence, as you would to a host or guest', type: 'textarea', required: true,
        placeholder: 'e.g. A guided time under the sky to slow down, look up and reflect. It is not therapy.' }
    ]
  },
  contacts: {
    title: 'Local support contacts', workbook: 'p.11',
    fields: [
      { id: 'crisis',    label: 'Crisis or emergency line', placeholder: 'Organisation, number, hours', required: true },
      { id: 'community', label: 'Counselling or community support', placeholder: 'Organisation, how to refer, hours', required: true },
      { id: 'mentor',    label: 'Your supervisor or mentor', placeholder: 'Name and contact', required: true }
    ]
  },
  selfcare: {
    title: 'My self-care plan', workbook: 'p.4',
    fields: [
      { id: 'values',  label: 'What I want to stand for as a guide (my values)', type: 'textarea', required: true },
      { id: 'signs',   label: 'My early warning signs (body, mood, behaviour)', type: 'textarea', required: true },
      { id: 'before',  label: 'Before a session I…', required: true },
      { id: 'during',  label: 'During a session, if I am affected, I…', required: true },
      { id: 'after',   label: 'After a session I…', required: true },
      { id: 'who',     label: 'Who I talk to', required: true },
      { id: 'limits',  label: 'My boundaries (what I do not take on)', type: 'textarea' }
    ]
  },
  segment: {
    title: 'My session design', workbook: 'p.9',
    fields: [
      { id: 'setting', label: 'Product, setting or group', placeholder: 'e.g. Friday observatory evening, 12 guests', required: true },
      { id: 'backup',  label: 'Cloudy-night or indoor backup', placeholder: 'Where, and with what (projection, images, window)' },
      { id: 'arrive',  label: 'Arrive (about 2 min)', type: 'textarea', required: true },
      { id: 'hook',    label: 'Hook: one fact or image', required: true },
      { id: 'activity',label: 'Activity and the ACT process it trains', required: true },
      { id: 'choices', label: 'Choices I will offer', type: 'textarea', required: true },
      { id: 'safety',  label: 'Safety plan (light, position, exits, who might struggle)', type: 'textarea', required: true },
      { id: 'close',   label: 'Close and signpost (about 1 min)', type: 'textarea', required: true }
    ]
  },
  tourism: {
    title: 'Astro-tourism: what changes', workbook: 'p.8',
    fields: [
      { id: 'show',    label: 'Paying guests expecting a "show": my plan', type: 'textarea', required: true },
      { id: 'mix',     label: 'Mixed ages, languages, cultures: my plan', type: 'textarea' },
      { id: 'dark',    label: 'Darkness and physical safety: my plan', type: 'textarea', required: true },
      { id: 'alcohol', label: 'Alcohol or late hours: my plan', type: 'textarea' },
      { id: 'oneoff',  label: 'One-off contact, no follow-up: my plan', type: 'textarea' },
      { id: 'words',   label: 'How I describe it (no therapy claims)', required: true }
    ]
  },
  mission: {
    title: 'Sky Mission', workbook: 'p.10',
    fields: [
      { id: 'who',    label: 'Who will you invite?', placeholder: 'A person, a friend group, a tour group', required: true },
      { id: 'when',   label: 'When and where?', placeholder: 'Within the next 7 days', required: true },
      { id: 'what',   label: 'What will you run?', placeholder: 'e.g. 5-minute Five-Sense Landing, or my segment', required: true },
      { id: 'commit', label: 'My one-line commitment', placeholder: 'Link it to your self-care plan' }
    ]
  },
  reflection: {
    title: 'After your session', workbook: null,
    fields: [
      { id: 'worked',    label: 'What worked?', type: 'textarea', required: true, placeholder: 'What helped the group settle, look or reflect?' },
      { id: 'difficult', label: 'What felt difficult?', type: 'textarea', required: true, placeholder: 'Name it without judging yourself.' },
      { id: 'adjust',    label: 'What will you adjust next time?', type: 'textarea', required: true, placeholder: 'One concrete change.' },
      { id: 'me',        label: 'How did you look after yourself afterwards?', type: 'textarea' },
      { id: 'confidence',label: 'How confident do you feel facilitating now? (1 to 5)', type: 'scale', required: true }
    ]
  }
};

/* Five activity cards. `indoor` = indoor or cloudy version, `trauma` = trauma-informed watch-fors.
 * `practice` = the practice tool shown on the unit's Try screen. */
const CARDS = {
  landing: {
    title: 'The Five-Sense Landing', time: '10–15 min', act: ['present'],
    purpose: 'Most people arrive carrying the rest of their day. This activity moves them into contact with the present moment, so everything you offer afterwards lands on settled attention. It is also your home base: return to it whenever a group gets unsettled.',
    when: 'First, before any reflection. Again at any point when the group is restless or someone is unsettled.',
    prep: 'Almost none. Somewhere people can sit or stand comfortably with some sky (or a screen) in view. Decide your route through the senses in advance.',
    steps: [
      'Say what is coming and how long it takes: "This takes about five minutes. Eyes can stay open. You can stop whenever you like."',
      'Hold ten seconds of quiet before speaking again.',
      'Feet on the ground. Notice what is holding you: the chair, the ground.',
      'Let your eyes find three things around you. Name them silently.',
      'Two sounds, near or far. Then something you can touch.',
      'The temperature of the air on your face.',
      'Now let your eyes rest on the sky (or the screen). Two to three minutes of quiet looking.',
      'Come back: notice who is here with you. Invite one simple noticing from anyone who wants to share.'
    ],
    prompt: 'There is nowhere to be right now except here. Let the day fall back a little. What can you hear? When you are ready, look up and let your eyes rest on what is actually there.',
    trauma: [
      'Eyes open is the default. "Close your eyes" is an invitation at most, never an instruction.',
      'Use outside anchors (the room, the ground, the sky) rather than deep inward attention. Inward focus can tip someone out of their window.',
      'Keep silences short at first. Say how long they will last.',
      'A clear ending matters: always bring people back to the room and the group.'
    ],
    indoor: 'Use a window, or project a calm starfield (Stellarium or a still image). Keep lights dimmed, never fully off. The last step becomes "let your eyes rest on the screen".',
    after: 'Thank anyone who shared, with no commentary. Let the group know the quiet was the point.',
    solo: 'Run the whole sequence on yourself in real time, with the real pauses. The hardest part is holding ten seconds of quiet before you speak. Rehearse it until it feels natural.',
    practice: { w: 'silence' }
  },
  skywithin: {
    title: 'The Sky Within', time: '12–18 min', act: ['self', 'acceptance'],
    purpose: 'The sky is a lived picture of the observing self: a wide space in which clouds, light and darkness pass, while the sky itself stays. You let the sky show the idea rather than explaining it.',
    when: 'After arrival, and before any work with difficult thoughts. It builds the observing stance that makes stepping back possible.',
    prep: 'No materials. Prepare to ask one spacious question and then stay quiet.',
    steps: [
      'Invite people to look at the sky as a space that holds things, not as scenery.',
      'Name that weather, light, darkness and movement all happen within it.',
      'Ask what stays the same while those contents change.',
      'Invite people to notice whether anything in them feels like that space.',
      'Let the question sit, about a minute, without needing an answer.',
      'Offer optional reflection on what it is like to be the one noticing.'
    ],
    prompt: 'Notice the sky holding everything: clouds, light, darkness. None of it changes the sky. Is there a part of you that is a bit like that, that notices your inner weather without being the weather?',
    trauma: [
      '"Inner weather" can bring up a heavy feeling. Keep it light: "whatever is there today, even just tiredness".',
      'Nobody has to name what they noticed.',
      'If someone looks flat or far away (hypoarousal), bring them back to the room with an outside anchor rather than going deeper.'
    ],
    indoor: 'A Stellarium time-lapse with clouds drifting over the stars, or a slow sky rotation. Remembered skies work too: "Think of a sky you know well."',
    after: 'Let the question linger. There is no correct answer to collect. Receive any sharing without interpreting it.',
    solo: 'Be the participant first. Two minutes with a real or remembered sky, then ask yourself the prompt. Speaking from that experience is more convincing than speaking from theory.',
    practice: { w: 'quiet', secs: 60, label: 'Let the question sit for one minute. This is how long it lasts for your group.' }
  },
  thoughts: {
    title: 'Placing Thoughts in the Sky', time: '12–18 min', act: ['defusion'],
    purpose: 'Helps people step back from a recurring thought and look at it rather than from inside it. Cosmic scale gives the thought room without arguing with it or pushing it away.',
    when: 'After arrival and ideally after The Sky Within. It asks more of people, so never open a session with it.',
    prep: 'Optional paper cards and pens. Be ready to say, more than once, that nobody ever has to say their thought aloud.',
    steps: [
      'Invite people to bring to mind a recurring thought. A mild one: "I am running late" is enough.',
      'Reassure them they will not say it aloud.',
      'Ask them to imagine placing that thought in the sky, far away, as one faint point of light.',
      'Notice its edges, size, movement and the space around it.',
      'Widen the view: the age of starlight, the scale of the sky.',
      'Ask what changed: the thought itself, or the distance from it?',
      'Close by grounding: feet on the floor, back to the room.'
    ],
    prompt: 'Bring to mind a thought that comes back often. Look up and imagine placing it somewhere in the sky. Give it space. Notice what it is like to look at this thought from out here, rather than from inside it.',
    trauma: [
      'Ask for a mild thought, every time. Defusion is never used on trauma memories or acute distress.',
      'Distance is not dismissal. If someone worries their thought matters, agree: it can matter and still be seen from a step back.',
      'Cards are theirs to keep or bin. Never collect or read them.',
      'Always end on something settling, not open-ended.'
    ],
    indoor: 'Zoom out slowly in Stellarium after people place their thought: "The thought is still there. It is one point of light among many."',
    after: 'Affirm that a thought can matter and be seen from a distance. Do not probe what was shared.',
    solo: 'Try it on a mildly sticky thought of your own first. Notice how distance changes your relationship to it without changing its content.',
    practice: { w: 'defuse' }
  },
  paleblue: {
    title: 'The Pale Blue Dot Reflection', time: '10–15 min', act: ['values', 'self'],
    purpose: 'One moment of cosmic perspective softens self-preoccupation and opens a wider, kinder vantage point, the ground from which reflection on what matters becomes possible.',
    when: 'After arrival and some observing work, as a bridge toward values. It leads naturally into Finding Your Guiding Stars.',
    prep: 'Choose one hook (old starlight, the Moon, the Pale Blue Dot image) and decide exactly how you will say it in one or two sentences. Do not prepare a second fact.',
    steps: [
      'Invite quiet looking, or show the Earth-from-space image.',
      'Name the scale gently, in one or two sentences.',
      'Ask what feels smaller from this vantage point.',
      'Ask what feels more precious.',
      'Allow private reflection before any sharing.',
      'Close by bringing attention back to the group and the ground.'
    ],
    prompt: 'From this wider view, what becomes smaller? And what becomes more precious? Let the answers arrive quietly. You do not need to solve anything tonight.',
    trauma: [
      'Avoid "we are insignificant" and "those stars are already dead". For someone grieving or depressed these can land hard. Use "we belong to something vast".',
      'Some people find vastness frightening rather than freeing. Watch for it and come back to the ground sooner.',
      'Keep sharing optional and brief.'
    ],
    indoor: 'Show the Pale Blue Dot or Earthrise image full screen in a dim room. Let it stay up in silence for at least 30 seconds.',
    after: 'Return to the group and the ground, so people come back from the wide view feeling held rather than adrift.',
    solo: 'Say your one hook slowly, then sit in silence. Notice the pull to add more facts. That urge is what you are training out.',
    practice: { w: 'quiet', secs: 30, label: 'Say your one hook out loud, then start the timer. Thirty seconds of silence, no second fact.' }
  },
  guiding: {
    title: 'Finding Your Guiding Stars', time: '18–25 min', act: ['values', 'action'],
    purpose: 'Stars as an image for values: fixed points you can steer by while life moves. Reflection becomes one small, values-led step. Story is often the bridge.',
    when: 'Last, after arrival and perspective. Values work before people have settled produces polite answers, not real reflection.',
    prep: 'Choose a sky story in advance (see Library) or, with permission and credit, a local one. Where cultural knowledge holders are present, ask their guidance first. Paper if people want to write.',
    steps: [
      'Frame stars as orientation points, not instructions.',
      'Tell the story slowly, with a real silence after.',
      'Ask what in the story feels true to life.',
      'Invite people to name two or three things they want their life to be about.',
      'Ask where those values are pointing them now.',
      'Invite one small, concrete step for the coming week.',
      'Close by looking up together.'
    ],
    prompt: 'If those values were stars you could navigate by, where would they be pointing you right now? What is one small step you could take this week in that direction?',
    trauma: [
      'Values work can show a gap between someone’s life and what they care about. Treat the gap as honest information, not failure, and do not try to close it in the session.',
      'Keep the step small and doable. Never set "homework".',
      'Sky stories belong to cultures. Credit them, and never use Indigenous knowledge as decoration.'
    ],
    indoor: 'Show the constellation in your story on screen, then dim it to a few stars while you tell the story.',
    after: 'Acknowledge the long human history of finding the way by the stars. Normalise any gap gently.',
    solo: 'Practise telling your story slowly with a real pause after. Then run the reflection on yourself and name one small step of your own.',
    practice: { w: 'silence' }
  }
};

const NARRATIVES = [
  { title: 'Old starlight', body: 'The light reaching your eye from a distant star may have been travelling for hundreds or thousands of years. You are seeing a message sent long before you were born, arriving at the moment you chose to look up.' },
  { title: 'The Pale Blue Dot', body: 'In 1990 the Voyager 1 spacecraft turned its camera back toward Earth from beyond the planets. Our planet appears as a tiny point of light, less than a pixel wide. Everyone who has ever lived, every joy and every hardship, sits on that small blue dot.' },
  { title: 'Navigating by stars', body: 'For thousands of years people found their way across oceans and deserts by looking up. The stars did not tell them where to go; they told them where they were. Values work the same way: we do not reach them, we steer by them.' }
];

const PIVOT = 'Let’s come back to what is here: the ground under our feet, the air on our skin, the sounds around us, and the sky above us.';
const HANDOFF = 'What you’ve shared matters, and I want to make sure you have proper support for it. Would it be OK if I shared some contact details before you leave tonight?';

const UNITS = [
  /* ---------------- Stage 0 ---------------- */
  {
    id: '0.1', stage: 0, title: 'Welcome and your scope', minutes: 5, act: [],
    intro: 'Before you guide anyone, settle one question: what is this, actually? Getting this right protects your participants and you.',
    learn: [
      { h: 'What you will do', p: 'You will help people slow down, look up and reflect. Astronomy gives the setting and the sense of space. Your facilitation gives the structure and the safety.' },
      { h: 'Who owns the experience', p: 'Participants keep ownership of their inner experience. They decide what, if anything, to share.' },
      { h: 'The line you hold', p: 'This is not counselling, assessment, diagnosis, treatment or crisis support, and it does not replace them. Holding that line is not cold. It is what makes the warmth trustworthy.' },
      { h: 'In your role, or outside it?', p: 'Sort each action. You will meet all of these on a real night.', w: 'sort',
        bins: [['in', 'In my role'], ['out', 'Outside it']],
        items: [
          { t: 'Guide five quiet minutes of looking up.', bin: 'in', why: 'This is the work: structure, space and safety.' },
          { t: 'Tell a guest their sadness sounds like depression.', bin: 'out', why: 'That is diagnosis. You receive what people share; you do not label it.' },
          { t: 'Share a support number, after asking permission.', bin: 'in', why: 'Connecting someone to proper support is part of your role.' },
          { t: 'Ask a tearful guest what happened in their past.', bin: 'out', why: 'Exploring causes is therapy. It is outside your scope.' },
          { t: 'Say "anyone can take a break, the door is there."', bin: 'in', why: 'Choice, offered to everyone, every time.' },
          { t: 'Advise a guest on what to do about their marriage.', bin: 'out', why: 'You do not advise. You can say it sounds hard, and offer contacts.' }
        ] },
      { h: 'How this course works', p: 'Six stages, each unlocking the next, so Safety always comes before Practice. Units are short: a few screens to read, something to try out loud, and a check. Your progress and notes stay on this device only.' }
    ],
    try: { title: 'Say it out loud', text: 'Picture a real group you might gather. Say, out loud, one sentence describing the session to them. Notice whether it promises an outcome (a warning sign) or offers an experience (the goal).' },
    check: [ { kind: 'form', form: 'scope' }, { kind: 'confirm', label: 'I offer reflection, not therapy. I will not diagnose, advise, assess risk or interpret what people share.' } ],
    note: 'Why do you want to facilitate this work?'
  },

  /* ---------------- Stage 1 ---------------- */
  {
    id: '1.1', stage: 1, title: 'Mental health is for everyone', minutes: 10, act: [],
    intro: 'Mental health is not a condition some people have. Everyone has it, and it moves.',
    learn: [
      { h: 'A line we all move along', p: 'Think of a line: thriving, coping, struggling, unwell. We all move along it, sometimes within a single week. A guest who looks fine may be near the struggling end tonight, and so may you.' },
      { h: 'Who comes to look at the sky', p: 'Groups under the sky often include people on a grief trip, a burnout break, or a "bucket list" visit after illness. Dark, quiet, awe-filled settings can open people up. That is why this work is powerful, and why it needs care.' },
      { h: 'Three guests arrive', p: 'Guess where each one is tonight, then tap the card to turn it over.', w: 'guests',
        guests: [
          { out: 'Jokes with everyone at the gate. Loudest laugh in the group.', zone: 'Struggling', inn: 'Three weeks since a redundancy letter. The jokes are how they are getting through the evening.' },
          { out: 'Barely speaks. Stands a little apart, hands in pockets.', zone: 'Thriving', inn: 'Quiet by nature and completely content. This is their favourite kind of night.' },
          { out: 'Asks sharp technical questions about the telescope.', zone: 'Coping', inn: 'A carer on their first evening off in months. Tired, glad to be here, holding it together.' }
        ],
        after: 'You could not have known. You do not need to.' },
      { h: 'So what is your job?', p: 'Your role is not to work out where anyone sits on the line. It is to design a session that is safe wherever they sit.' }
    ],
    keyPoints: ['Everyone is somewhere on the continuum.', 'You cannot tell from the outside.', 'Design for everyone, not for a "typical" guest.'],
    try: { title: 'Place yourself', text: 'Without judging it, notice where you are on the line today: thriving, coping, struggling or unwell. Then think of one time a person under the sky surprised you by being moved, upset or unusually quiet.' },
    check: [ { kind: 'quiz', items: [
      { q: 'A cheerful guest jokes all evening. Where are they on the continuum?',
        options: [
          { t: 'Thriving, clearly.', why: 'Mood on the surface tells you little. You cannot know.' },
          { t: 'You cannot know, and you do not need to.', correct: true, why: 'Right. You design a session that is safe for whoever is there.' },
          { t: 'Probably masking something; ask them privately.', why: 'Probing is outside your role. Keep the session safe for everyone instead.' }
        ] }
    ] } ],
    note: 'One thing about guests that you want to remember from this unit.'
  },
  {
    id: '1.2', stage: 1, title: 'Trauma-informed practice and the window of tolerance', minutes: 15, act: ['present'],
    intro: 'You will never know who in your group carries trauma. So you design for everyone.',
    learn: [
      { h: 'Trauma, in plain words', p: 'Trauma is an experience that overwhelmed someone’s capacity to cope. It can leave the nervous system on alert long afterwards. Trauma-informed practice does not mean treating trauma. It means not accidentally adding to it.' },
      { h: 'The window of tolerance', p: 'Three bands. Tap each one. Reflection only works inside the window, so your job is to help people stay in it, or find their way back.', w: 'window',
        bands: [
          { id: 'above',  name: 'Above the window', tech: 'Hyperarousal', signs: 'Agitated, restless, talkative, anxious.', you: 'Slow your voice. Bring the group to the ground and the senses.' },
          { id: 'inside', name: 'Inside the window', tech: 'Where reflection works', signs: 'Able to notice, reflect and connect.', you: 'This is where your activities belong. Protect it with choice and predictability.' },
          { id: 'below',  name: 'Below the window', tech: 'Hypoarousal', signs: 'Flat, spaced-out, frozen, withdrawn.', you: 'Do not go deeper inward. Use an outside anchor: the room, the ground, three things you can see.' }
        ] },
      { h: 'Read the signs', p: 'Where is each guest right now?', w: 'sort',
        bins: [['above', 'Above'], ['inside', 'Inside'], ['below', 'Below']],
        items: [
          { t: 'Talking fast, laughing loudly, cannot keep still.', bin: 'above', why: 'Hyperarousal: agitated, restless, talkative.' },
          { t: 'Staring blankly. Does not respond when you speak to the group.', bin: 'below', why: 'Hypoarousal: flat, spaced-out, frozen.' },
          { t: 'Shares one small thing they noticed about the Moon.', bin: 'inside', why: 'Able to notice, reflect and connect.' },
          { t: 'Keeps checking the path back to the car park.', bin: 'above', why: 'Scanning for exits is a sign of being on alert.' },
          { t: 'Has gone very quiet and seems far away.', bin: 'below', why: 'Withdrawn and distant can mean below the window. Use an outside anchor.' },
          { t: 'Asks a curious question, then goes back to looking.', bin: 'inside', why: 'Curiosity with ease is the window at work.' }
        ] },
      { h: 'Six principles', p: 'These guide trauma-informed work. On a night session they look like: saying what comes next and how long it lasts, choice at every step, eyes open by default, nobody led away alone, and respect for whose sky stories you tell.',
        list: ['Safety', 'Trustworthiness and transparency', 'Peer support', 'Collaboration', 'Empowerment, voice and choice', 'Cultural, historical and gender awareness'] },
      { h: 'What is different under the sky', p: 'Some risks are specific to night sessions. Tap everything in this plan that could push someone out of their window.', w: 'spot',
        items: [
          { t: 'All lights off, for the best dark adaptation.', risk: true, why: 'Total darkness. Keep lights dim, never fully off.' },
          { t: '"This takes about five minutes."', risk: false, why: 'Predictable and time-limited.' },
          { t: '"Now close your eyes."', risk: true, why: 'Eyes open is the default. Closing them is an invitation at most.' },
          { t: 'You stand behind the group while they look up.', risk: true, why: 'A stranger standing behind you in the dark. Stay visible.' },
          { t: 'A red torch stays on by the path.', risk: false, why: 'A lit, clear way out supports safety.' },
          { t: 'You lead one guest away to the telescope alone.', risk: true, why: 'Nobody is led away alone.' },
          { t: '"Those stars are already dead."', risk: true, why: 'Themes of death or insignificance can land hard on someone grieving.' },
          { t: '"You can stop any time."', risk: false, why: 'Choice, said out loud.' }
        ] }
    ],
    keyPoints: ['Choice every time.', 'Say what is coming and for how long.', 'Eyes open by default; lights dim, never fully off.', 'Outside anchors (ground, room, sky) before inner focus.', 'No one has to share.'],
    try: { title: 'Map your setting', text: 'Picture a real session you might run. Name one thing in that setting that could push someone above the window and one that could push someone below it. What would you change?' },
    check: [ { kind: 'quiz', items: [
      { q: 'During quiet looking, a guest goes very still, stares blankly and does not respond when you speak to the group. What is most likely, and what do you do?',
        options: [
          { t: 'They are deeply relaxed. Leave them and extend the silence.', why: 'Possibly, but blank and unresponsive can be hypoarousal. Extending inner focus can take them further out.' },
          { t: 'Possibly below the window. Bring the whole group back with an outside anchor: feet on the ground, name three things you can see.', correct: true, why: 'Yes. You steady everyone without singling anyone out.' },
          { t: 'Go over, touch their shoulder and ask if they are OK in front of the group.', why: 'Touch and attention from the group can make it worse. Ground the group first, check in privately after.' }
        ] },
      { q: 'Which opening line is most trauma-informed?',
        options: [
          { t: '"Close your eyes and go deep inside."', why: 'Inward focus with eyes closed is the riskiest option for someone outside their window.' },
          { t: '"This takes about five minutes. Eyes can stay open, and you can stop any time."', correct: true, why: 'Predictable, time-limited, with choice. That is the pattern.' },
          { t: '"Trust me, everyone finds this relaxing."', why: 'It removes choice and sets an expectation some people cannot meet.' }
        ] }
    ] } ],
    note: 'Which of the six principles is hardest to hold in your setting, and why?'
  },
  {
    id: '1.3', stage: 1, title: 'ACT: open up, be present, do what matters', minutes: 15, act: ['present', 'acceptance', 'defusion', 'self', 'values', 'action'],
    intro: 'ACT (Acceptance and Commitment Therapy) is the map behind every activity. You carry it; participants never need to hear the word.',
    learn: [
      { h: 'Psychological flexibility', p: 'ACT aims for psychological flexibility: staying in touch with the present, making room for difficult feelings rather than fighting them, and continuing to move toward what matters. Put simply: open up, be present, do what matters.' },
      { h: 'Six processes', p: 'Tap each point on the map. Every one has an everyday example and a sky activity that trains it.', w: 'hex' },
      { h: 'A map for choosing', p: 'An evening under the sky touches all six almost by itself. The map helps you choose: does this group need grounding, perspective or a step toward values? Your own map fills in as you complete units that train each process.' },
      { h: 'Keep it plain', p: 'Use everyday language in the session. The moment a reflective space sounds clinical, people brace.' }
    ],
    try: { title: 'Step back from a thought', text: 'Try defusion on yourself before you guide it. Use a mildly annoying thought. "I am running late" will do. Nothing heavy.', w: 'defuse' },
    check: [ { kind: 'quiz', items: [
      { q: 'A guest says "I always ruin things." Which response fits ACT and your role?',
        options: [
          { t: '"That is not true, I am sure you are great."', why: 'Arguing with the thought keeps people inside it. It also dismisses them.' },
          { t: '"That sounds like a heavy thought to carry. You don’t have to do anything with it tonight."', correct: true, why: 'You receive it, make room for it, and stay in your role.' },
          { t: '"Where do you think that belief comes from?"', why: 'That is therapy. It is outside your scope.' }
        ] }
    ] } ],
    note: 'Write the six processes in your own sky words.'
  },
  {
    id: '1.4', stage: 1, title: 'Why the sky works', minutes: 15, act: ['self'],
    intro: 'You already know the sky. This unit is about what it does to people, and why your expertise can get in the way.',
    learn: [
      { h: 'Awe and the small self', p: 'Awe comes when something vast makes the mind stretch its usual frame. Research links it with less self-preoccupation and more openness, patience, generosity and meaning. One accurate image does this; ten facts usually do not.' },
      { h: 'Attention restoration', p: 'Effortful, directed attention gets tired through the day. Soft fascination, gentle interest that holds the mind without gripping it, lets it recover. The night sky offers being away, spaciousness and soft fascination.' },
      { h: 'The quiet is the work', p: 'So the quiet looking is not a warm-up. It is the intervention. Protect two to three minutes of it.' },
      { h: 'Perspective', p: 'Seeing Earth whole, or light older than you, changes the vantage point before personal reflection begins. Frame it as belonging to something vast, never as being insignificant.' },
      { h: 'The reframe for astronomers', p: 'In these moments, one fact and a long silence does more than ten facts.' }
    ],
    keyPoints: ['One fact, then silence.', 'Protect two to three minutes of quiet looking.', '"We belong to something vast", never "we are insignificant".'],
    try: { title: 'Three phone-free minutes', text: 'Start the timer, put the phone face down, and look at the sky, a window or a sky image. Notice how your own state shifts. A soft chime tells you when the time is up. Then choose the one cosmic hook that genuinely moves you, and write it as a single sentence starting "This light…".', w: 'quiet', secs: 180 },
    check: [ { kind: 'quiz', items: [
      { q: 'A guest asks a technical question during the quiet looking. Best move?',
        options: [
          { t: 'Answer fully; curiosity is engagement.', why: 'It ends the silence for everyone.' },
          { t: '"Great question, let’s come back to it after this quiet bit."', correct: true, why: 'You honour the question and protect the restorative minutes.' },
          { t: 'Ignore it.', why: 'Ignoring a guest breaks trust and safety.' }
        ] }
    ] } ],
    note: 'Your one-sentence cosmic hook.'
  },
  {
    id: '1.C', stage: 1, title: 'Stage check: scenarios', minutes: 5, act: [], checkpoint: true,
    intro: 'Four short scenarios. Pick the best response. You can try again as often as you like.',
    check: [ { kind: 'quiz', items: [
      { q: 'Halfway through a session, a guest starts talking fast, laughing loudly and fidgeting. Which zone, and what do you do?',
        options: [
          { t: 'Above the window. Slow your voice and bring the group to the ground and the senses.', correct: true, why: 'Yes. Grounding through the senses brings people back into the window.' },
          { t: 'In the window; they are just enjoying it. Speed up to match their energy.', why: 'Rising pace and agitation often mean the top of the window. Match it and it rises further.' },
          { t: 'Ask them to leave so others can focus.', why: 'Excluding someone is rarely needed and can harm. Steady the room first.' }
        ] },
      { q: 'You want to open with the most powerful activity. Which do you start with?',
        options: [
          { t: 'Placing Thoughts in the Sky, to go deep fast.', why: 'Defusion before arrival asks too much too soon.' },
          { t: 'Five-Sense Landing.', correct: true, why: 'Always arrive first.' },
          { t: 'Finding Your Guiding Stars.', why: 'Values work needs a settled group.' }
        ] },
      { q: 'Which phrase best fits the trauma-informed approach?',
        options: [
          { t: '"Those stars are already dead."', why: 'True of a few, but a heavy theme for someone grieving.' },
          { t: '"We are tiny and insignificant."', why: 'For some people this confirms their worst thought.' },
          { t: '"This light left its star before you were born, and arrived the moment you looked up."', correct: true, why: 'True, spacious and connecting.' }
        ] },
      { q: 'Which ACT process does "the sky holds the clouds but is not the clouds" train?',
        options: [
          { t: 'Committed action', why: 'That is about steps toward values.' },
          { t: 'Self-as-context (the observer)', correct: true, why: 'Yes. The sky is the image of the noticing self.' },
          { t: 'Values', why: 'Values are directions; this is about the noticing self.' }
        ] }
    ] } ]
  },

  /* ---------------- Stage 2 ---------------- */
  {
    id: '2.1', stage: 2, title: 'Boundaries and the warm hand-off', minutes: 10, act: ['values'],
    intro: 'Safety starts with a boundary you can say without flinching, and a plan for when someone needs more than you can offer.',
    learn: [
      { h: 'A firm outer edge', p: 'You do not diagnose, advise, interpret what people share, or assess risk. Inside that edge you can do a lot: receive someone warmly, make sure they do not feel alone, and connect them to proper support.' },
      { h: 'Clear is kind', p: 'Clear boundaries do not make a space colder. Vagueness is what creates risk: people may share more than the setting can hold, and you may be pulled beyond your training. Say the boundary plainly and kindly at the start.' },
      { h: 'The warm hand-off', p: 'A warm hand-off is human, specific and prepared. Not "you should talk to someone", but: here is who, the number, the hours, and what usually happens when you call. Ask permission before sharing contacts. Never search for resources in the moment.', script: HANDOFF },
      { h: 'Three contacts, every session', p: 'Before every session you need a crisis or emergency line, a counselling or community service, and your own supervisor or mentor. You will enter yours at the end of this unit.' }
    ],
    try: { title: 'Rehearse it', text: 'Say the hand-off out loud until it sounds like you and not like a disclaimer. Hesitation is what people read as discomfort. Each time you say it, more of the words fade.', w: 'rehearse', phrase: HANDOFF, reps: 3 },
    check: [
      { kind: 'quiz', items: [
        { q: 'After the session a guest says quietly, "I’ve been really low lately." Which response is a warm hand-off?',
          options: [
            { t: '"You should really talk to someone about that."', why: 'Vague. It leaves them to find help alone.' },
            { t: '"Thank you for telling me. Would it be OK if I shared some contact details?" Then who, the number, the hours, and what happens when you call.', correct: true, why: 'Human, specific, prepared, and with permission.' },
            { t: '"Hold on, let me search for a helpline on my phone."', why: 'Never search in the moment. The contacts are prepared before the session.' }
          ] }
      ] },
      { kind: 'form', form: 'contacts', intro: 'Fill in real contacts for where you will facilitate. This unit is not done until they exist. They also appear in Session mode.' }
    ],
    note: 'Your boundary sentence, in your own words.'
  },
  {
    id: '2.2', stage: 2, title: 'When the weather turns heavy', minutes: 10, act: ['present', 'acceptance'],
    intro: 'Sometimes a session stirs more than you expect. A calm, rehearsed response turns a moment of distress into a moment of safety.',
    learn: [
      { h: 'Steady the room first', p: 'When strong emotion shows up, bring the whole group back to the senses: the ground, the air, the sounds, the sky. This steadies the person who is struggling without singling them out.', script: PIVOT },
      { h: 'Pace before words', p: 'Pace and tone matter more than words. A slow, concrete, undramatic voice says nothing has gone wrong and you are not frightened.' },
      { h: 'Space, then follow-up', p: 'Offer space to everyone: "Anyone can take a break; the door is there." Afterwards, check in privately, offer your contacts, and tell your supervisor. If anyone’s safety is at immediate risk, pause the session and follow your local emergency procedure.' },
      { h: 'Why it is prepared', p: 'You will usually not have a clinician with you. That is exactly why the contacts and the pivot are prepared in advance.' }
    ],
    keyPoints: ['Stay steady.', 'Ground the group (eyes open, outside anchors).', 'Offer space without singling anyone out.', 'Check in privately, offer contacts.', 'Tell your supervisor.'],
    try: { title: 'Make the pivot automatic', text: 'Say the pivot aloud, slowly, five times. Words fade each time, so by the end you are saying it from memory. Say the last one as if a guest has just started crying.', w: 'rehearse', phrase: PIVOT, reps: 5 },
    check: [ { kind: 'scenario', title: 'A heavy moment, start to finish', start: 'a', nodes: {
      a: { text: 'It is 21:40. Eleven guests are ten minutes into Placing Thoughts in the Sky. In the quiet you hear someone crying softly near the back. It is a woman who came on her own.',
        options: [
          { t: 'Pause and ask her gently what came up.', back: 'Eleven faces turn towards her. She shakes her head and looks at the ground. You have put her at the centre and asked her to perform her distress.' },
          { t: 'Use the pivot, for the whole group.', to: 'b' },
          { t: 'Carry on as planned so you do not draw attention to her.', back: 'Two minutes later she is still crying and two guests are watching her instead of the sky. Ignoring it has left her alone with it.' }
        ] },
      b: { text: 'You slow your voice: "Let’s come back to what is here: the ground under our feet, the air on our skin…" Shoulders drop around the circle. Her breathing slows, though she is still tearful.',
        options: [
          { t: 'Walk over and put a hand on her shoulder.', back: 'She flinches. Touch from a near-stranger in the dark, with the group watching, is a risk however kind the intent.' },
          { t: 'Move straight to the Pale Blue Dot to lift the mood.', back: 'Too fast. The group is not settled yet, and vastness can land hard on someone who is already raw. Stay with the ground.' },
          { t: 'Say to everyone: "Anyone can take a break. The path back is lit, and I’ll be right here."', to: 'c' }
        ] },
      c: { text: 'She stays. You close on the ground with a short Five-Sense Landing, and people drift to their cars. She lingers. Privately she says: "Sorry about that. My brother died in March. It all just came up."',
        options: [
          { t: '"Thank you for telling me. You don’t need to apologise. Would it be OK if I shared some contact details for proper support before you go?"', to: 'd' },
          { t: '"I’m so sorry. Grief comes in stages. It sounds like you might be stuck in one."', back: 'That is interpretation and advice. Receive what she said; do not explain it to her.' },
          { t: '"Don’t worry, the sky does that to people. You’ll feel better tomorrow."', back: 'This brushes past what she told you and promises an outcome you cannot know.' }
        ] },
      d: { text: 'She says yes. You give her the counselling service from your contacts: who they are, the number, the hours, what happens when you call. She thanks you and leaves. It is 22:30 and you are packing up alone.',
        options: [
          { t: 'Write her name and her story in your session notes so you remember.', back: 'Keep notes on facilitation, not on participants. No personal stories or identifying details without clear consent.' },
          { t: 'Pack up and head home. She has the number; it is handled.', back: 'Two things are left: your supervisor needs to know, and so do you. Carrying it alone is how compassion fatigue starts.' },
          { t: 'Send your supervisor a short note with no identifying details, then look after yourself.', to: 'end' }
        ] },
      end: { text: 'That is the whole sequence: stay steady, ground the group, offer space, check in privately, offer contacts, tell your supervisor. Your own plan for the "look after yourself" part is the next unit.' }
    } } ],
    note: 'What would make it hard for you to stay steady? What would help?'
  },
  {
    id: '2.3', stage: 2, title: 'Looking after yourself', minutes: 15, act: ['values', 'action'],
    intro: 'Self-care is not a bath bomb. It is how you stay in your own window so you can help others stay in theirs.',
    learn: [
      { h: 'The cost of holding', p: 'Guides and facilitators often work late, alone and with strangers. Holding other people’s feelings has a cost. Compassion fatigue and vicarious stress build up slowly.' },
      { h: 'Early warning signs', p: 'Know yours before you need them.', list: ['Dreading sessions', 'Feeling numb', 'Irritability', 'Poor sleep after late shifts', 'Replaying a guest’s story'] },
      { h: 'What a good plan covers', p: 'A good self-care plan is built on your values (why you do this). It covers before, during and after a session, who you talk to, and what you do not take on.' },
      { h: 'Same as your workbook', p: 'This plan is the same as page 4 of the in-person workbook. If you were at the training day, copy it in here.' }
    ],
    try: { title: 'Notice your signs', text: 'Think back to a demanding evening. What did your body, mood and behaviour do the next day? Those are your early warning signs.' },
    check: [ { kind: 'form', form: 'selfcare' } ],
    note: 'One part of your plan you are willing to tell someone about.'
  },
  {
    id: '2.C', stage: 2, title: 'Stage check: ready to be safe', minutes: 2, act: [], checkpoint: true,
    intro: 'Before Practice opens, confirm the safety layer is in place.',
    check: [ { kind: 'ready', requires: ['contacts', 'selfcare'] }, { kind: 'confirm', label: 'I know my pivot phrase and the warm hand-off script.' } ]
  },

  /* ---------------- Stage 3 ---------------- */
  {
    id: '3.1', stage: 3, title: 'The opening script: arrive, widen, reflect', minutes: 10, act: ['present'],
    intro: 'The shortest reliable structure. With it, you can guide a five-minute sky check-in with no slides, no telescope and no perfect sky.',
    learn: [
      { h: 'Step 1: arrive', p: 'Help people land in the body and the place before saying anything about the sky. Breath, air, ground, sound. Hold ten seconds of quiet before you speak.' },
      { h: 'Step 2: the cosmic hook', p: 'Offer one true image, fact or story that widens the view. Old starlight, the Moon, the Pale Blue Dot, a local sky story. One only. Let it land in silence.' },
      { h: 'Step 3: reflection', p: 'One clean question, not a list. Then stop talking. The silence is where the work happens. Sharing is optional and about noticing, never confession.' },
      { h: 'Say less', p: 'Say less than you are tempted to. Most over-talking comes from facilitator nerves. Give enough instruction for safety and clarity, then trust the structure. When a session wanders, come back to these three steps.',
        script: 'Let the day fall back a little. Notice the ground, the air, the sounds nearby, and then the sky. … This light may have been travelling for hundreds of years to arrive in your eyes right now. … From this wider view, what feels worth moving toward? You don’t need to answer aloud.' }
    ],
    try: { title: 'How long is ten seconds?', text: 'Run the three steps out loud, alone, with the real pauses. Then test your sense of the silence. Nerves make ten seconds feel like thirty, which is why most facilitators speak too soon.', w: 'silence' },
    check: [
      { kind: 'quiz', items: [
        { q: 'You have asked your reflection question. Four seconds of silence already feel endless. What do you do?',
          options: [
            { t: 'Rephrase the question in case it was unclear.', why: 'Rephrasing restarts the clock and tells the group that silence is a problem.' },
            { t: 'Add a second, easier question.', why: 'One clean question, not a list.' },
            { t: 'Stay quiet and count ten slow seconds.', correct: true, why: 'The silence is where the work happens. The discomfort is yours, not theirs.' }
          ] }
      ] },
      { kind: 'confirm', label: 'I ran the three steps out loud, with real pauses.' }
    ],
    note: 'Your opening, in your own words.'
  },
  { id: '3.2', stage: 3, card: 'landing',   minutes: 10 },
  { id: '3.3', stage: 3, card: 'skywithin', minutes: 10 },
  { id: '3.4', stage: 3, card: 'thoughts',  minutes: 10 },
  { id: '3.5', stage: 3, card: 'paleblue',  minutes: 10 },
  { id: '3.6', stage: 3, card: 'guiding',   minutes: 12,
    extraCheck: [ { kind: 'order', title: 'Put the five activities in the order you would run them',
      why: 'Arrive first. Build the observer before stepping back from thoughts. Perspective bridges to values, and values come last.',
      items: ['landing', 'skywithin', 'thoughts', 'paleblue', 'guiding'] } ] },

  /* ---------------- Stage 4 ---------------- */
  {
    id: '4.1', stage: 4, title: 'Your sky and your people', minutes: 10, act: [],
    intro: 'Keep the purpose; change the form to fit the real sky and the real people in front of you.',
    learn: [
      { h: 'Enough sky', p: 'A perfect dark sky is not required. What matters is looking up together. Moon over a city, one planet, clouds, a rooftop, a window, a planetarium, or a projected sky in a dimmed room all work.', script: 'We don’t need a perfect sky tonight. We need enough sky to look up together.' },
      { h: 'Telescopes', p: 'Telescopes can enrich a session but can also turn it into a queue and a Q&A. Keep the core: looking, space, reflection.' },
      { h: 'Adapt for people', p: 'Offer private reflection, drawing or writing instead of group sharing.',
        list: ['Young people often need more movement and concrete questions.', 'Older adults may connect with memory and the long view.', 'Groups affected by conflict, displacement or acute stress need more non-verbal grounding and fewer reflective questions.'] },
      { h: 'Stories belong to cultures', p: 'Invite people to bring their own sky knowledge. Where elders or cultural knowledge holders are involved, ask their guidance before using community stories, and credit them.' }
    ],
    try: { title: 'Three places', text: 'Name three places you could run a session, including one indoor fallback. For the group you are most likely to work with, write one concrete adaptation ("offer drawing instead of sharing", not "be sensitive").' },
    check: [
      { kind: 'quiz', items: [
        { q: 'Thick cloud rolls in an hour before your session. Best move?',
          options: [
            { t: 'Cancel. Without stars there is no session.', why: 'The purpose is looking up together, and you have a fallback.' },
            { t: 'Go ahead, and apologise several times for the sky.', why: 'Adapt without apologising. Apology tells the group they are getting less.' },
            { t: 'Move to your indoor fallback and open with: "We need enough sky to look up together."', correct: true, why: 'Keep the purpose, change the form.' }
          ] }
      ] },
      { kind: 'confirm', label: 'I have an indoor or cloudy-night fallback for my setting.' }
    ],
    note: 'Your three places and one adaptation.'
  },
  {
    id: '4.2', stage: 4, track: 'tourism', title: 'Astro-tourism: what changes', minutes: 25, act: ['values'],
    intro: 'Paying guests, mixed groups, darkness and one-off contact change how you hold this work.',
    learn: [
      { h: 'Guests expect a show', p: 'Frame the wellbeing segment as optional, short (about 10 minutes) and part of the experience.', script: 'We’ll take a few quiet minutes to just look, the way people have for thousands of years.' },
      { h: 'Mixed groups', p: 'Children, couples, several languages and cultures. Use simple language, offer choices out loud, and credit the sky stories you tell.' },
      { h: 'Night-time safety', p: 'Physical safety is part of trauma-informed practice: red light, never fully dark, you always visible, nobody led away alone, a clear way back to the vehicle or building.' },
      { h: 'Alcohol and late hours', p: 'Both lower everyone’s window. Keep reflection light, or skip it.' },
      { h: 'One-off contact', p: 'There is no follow-up. Signposting matters more, so have your contacts ready and a simple card or QR code you can hand over.' },
      { h: 'Marketing ethics', p: 'Say "a reflective night-sky experience". Never "healing", "therapy" or "cures anxiety". Do not promise outcomes.' },
      { h: 'Your role on the tour', p: 'You are not the therapist. If a guest is distressed: stay calm, ground them, give space, offer contacts, tell your supervisor.' }
    ],
    try: { title: 'Edit this listing', text: 'Tap every word or phrase that promises an outcome. Then open the description of a tour you run (or would run) and do the same.', w: 'flag',
      listing: 'Join our {healing} stargazing night under the darkest skies in the region. This {therapeutic} journey {melts away stress} and is {guaranteed to cure anxiety}. Enjoy a guided tour of the constellations, a few quiet minutes to look up, and hot chocolate by the fire. You will {leave transformed}.',
      rewrite: 'Join a reflective night-sky experience under the darkest skies in the region. Enjoy a guided tour of the constellations, a few quiet minutes to look up, and hot chocolate by the fire.' },
    check: [ { kind: 'form', form: 'tourism' } ],
    note: 'One sentence you could use in a tour listing.'
  },
  {
    id: '4.C', stage: 4, title: 'Design your session', minutes: 15, act: ['action'], checkpoint: true,
    intro: 'Design a 10-minute segment or short session for a real setting. This is the same template as page 9 of the workbook. Use the activity cards in Session mode as reference.',
    check: [ { kind: 'form', form: 'segment' } ]
  },

  /* ---------------- Stage 5 ---------------- */
  {
    id: '5.1', stage: 5, title: 'Your Sky Mission', minutes: 5, act: ['action'],
    intro: 'Learning becomes skill when you do it. Within the next 7 days, run your segment or a 5-minute Five-Sense Landing with one person or group.',
    learn: [
      { h: 'Start small', p: 'One friend on a balcony counts. Before you go, open Session mode and run through the pre-session checklist.' },
      { h: 'Then come back', p: 'Afterwards, return here and complete your reflection. The last unit stays open for you.' }
    ],
    check: [ { kind: 'form', form: 'mission' } ]
  },
  {
    id: '5.2', stage: 5, title: 'Reflect and contribute', minutes: 10, act: ['acceptance', 'values'],
    intro: 'Facilitation is a practice, not a performance. A short review after each session is how you, and the programme, get better.',
    learn: [
      { h: 'Notes on facilitation, not people', p: 'Keep notes on facilitation, not on participants. Do not record personal stories or anything that identifies someone without clear consent.' },
      { h: 'Pass it on', p: 'Share what you learned with your network or the programme. The next facilitator in a setting like yours then starts from a stronger place.' },
      { h: 'And you?', p: 'Notice how you felt afterwards, too. That is your self-care plan at work.' }
    ],
    check: [ { kind: 'confirm', label: 'I have run my Sky Mission session.' }, { kind: 'form', form: 'reflection' } ],
    note: 'Anything else you want to remember.'
  }
];

const CHECKLIST = [
  'I can describe the session in one sentence that does not promise therapy or healing.',
  'My three support contacts are ready (crisis, counselling or community, supervisor).',
  'I know my opening: Five-Sense Landing, eyes open.',
  'I have said, or will say, what comes next and how long it lasts.',
  'Lights are dim, not off; the way out is clear; nobody is led away alone.',
  'I have an indoor or cloudy fallback.',
  'I know my pivot phrase.',
  'I have checked in with my own window today.'
];

const BOUNDARIES = [
  ['Reflection, not therapy', 'You create a safe reflective space. You do not assess, diagnose, counsel or process trauma.'],
  ['Choice every time', 'Eyes open, stay seated, skip any part. Say it out loud.'],
  ['The sky does the teaching', 'One fact, one question, then silence.'],
  ['Support before surprise', 'Know your three contacts before you start.'],
  ['Culture is not decoration', 'Credit sky stories. Invite people’s own knowledge.']
];

const GLOSSARY = [
  ['Window of tolerance', 'The zone where a person is calm enough to notice, reflect and connect. Above it: agitated. Below it: flat or frozen.'],
  ['Trauma-informed', 'Designing for everyone as if anyone might carry trauma: safety, predictability, choice, no forced sharing.'],
  ['Hyperarousal / hypoarousal', 'Above or below the window: agitated and restless, or numb, spaced-out and withdrawn.'],
  ['ACT', 'Acceptance and Commitment Therapy. Its aim is psychological flexibility: open up, be present, do what matters.'],
  ['Self-as-context', 'The part of you that notices thoughts and feelings without being swept away. The sky holding its weather.'],
  ['Cognitive defusion', 'Stepping back to look at a thought rather than from inside it.'],
  ['Psychological flexibility', 'Staying present, making room for difficult experience, and moving toward what matters.'],
  ['Attention restoration', 'Tired, effortful attention recovers through gentle, effortless interest, such as looking at the sky.'],
  ['Soft fascination', 'Relaxed attention that holds the mind without gripping it.'],
  ['Awe and the small self', 'Vastness that stretches the mind’s frame and quiets self-preoccupation.'],
  ['Cosmic hook', 'One true, vivid image, fact or story that widens perspective before reflection.'],
  ['Warm hand-off', 'A human, specific, prepared connection to support. Name, number, hours, next step.'],
  ['Compassion fatigue', 'The wearing-down that comes from holding other people’s distress over time.']
];

const RESOURCES = [
  { kind: 'Guidelines', title: 'Astronomy for Mental Health Guidelines', text: 'OAD open-access guidance for planning, adapting and reviewing astronomy-based wellbeing activities.', url: 'https://zenodo.org/records/15878612' },
  { kind: 'Programme', title: 'Astronomy for Mental Health project page', text: 'Background, aims and pilot contexts for the OAD flagship.', url: 'https://astro4dev.org/astronomy-for-mental-health-guidelines/' },
  { kind: 'Booklet', title: 'Narratives Reference Booklet', text: 'Sky narratives for values, storytelling and local adaptation.', url: 'https://doi.org/10.5281/zenodo.16420872' },
  { kind: 'Website', title: 'IAU Office of Astronomy for Development', text: 'Programmes, reports and opportunities.', url: 'https://astro4dev.org/' },
  { kind: 'Previous version', title: 'Pocket Guide (v1)', text: 'The original single-page facilitator guide.', url: 'https://acidian.github.io/IAU-OAD-Facilitator-Training/' }
];

/* Expand card units into the same shape as written units. */
UNITS.forEach(u => {
  if (!u.card) return;
  const c = CARDS[u.card];
  u.title = c.title;
  u.act = c.act;
  u.intro = c.purpose;
  u.learn = [
    { h: 'When to use it', p: c.when },
    { h: 'Prepare', p: c.prep },
    { h: 'Walk through the steps', p: 'Tap through the sequence once, slowly, the way your group will meet it.', w: 'walk', steps: c.steps },
    { h: 'Say something like', p: 'Your words will differ. The pace should not.', script: c.prompt },
    { h: 'Trauma-informed watch-fors', p: '', list: c.trauma, warn: true },
    { h: 'Indoor or cloudy version', p: c.indoor },
    { h: 'Closing', p: c.after }
  ];
  u.try = Object.assign({ title: 'Practise alone, out loud', text: c.solo }, c.practice || {});
  u.check = (u.extraCheck || []).concat([{ kind: 'confirm', label: 'I practised this alone, out loud, with the real pauses.' }]);
  u.note = 'What felt natural, and what will you change?';
});

return { ACT, TRACKS, STAGES, FORMS, CARDS, NARRATIVES, UNITS, CHECKLIST, BOUNDARIES, GLOSSARY, RESOURCES, PIVOT, HANDOFF };
})();
