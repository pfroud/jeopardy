# Jeopardy software

## Overview

Software to run a Jeopardy quiz game.

<details>
<summary>Click to expand an introduction to Jeopardy for readers who have not heard of it</summary>

[Jeopardy](https://en.wikipedia.org/wiki/Jeopardy!) is a TV quiz game show. You can get some idea of what it's like by watching videos on [the official Jeopardy youtube channel](https://www.youtube.com/@jeopardy/videos). There are three players and one host. All the players see a table of clues organized into categories and dollar values. One player chooses a clue, then the host reads the question, then all players can press a button to say an answer.

</details>

One person, who I call the *operator*, hosts the game, which means they read questions out loud and judge whether responses are correct. Any numbers of players split into teams then use buzzers to answer questions.

The game is played with people in the same physical room; it is not a network multiplayer game.

This software uses two web browser windows: The *operator window* reveals correct answers so it is only visible to the human operator. The *presentation window* shows questions to all the players. I use a laptop for the operator window and a big TV for the presentation window.

I made [buzzers](https://github.com/pfroud/jeopardy-buzzer-controller) specifically to use with this software, but any USB keyboard (like a QWERTY keyboard not a music keyboard) also works.

## Project history

In 2018, I was inspired by Tom Scott's YouTube game show [Lateral](https://www.youtube.com/playlist?list=PL96C35uN7xGLZj-FTNfZYmo3uv6-MJ0D-) to create a trivia series for [Silicon Valley Offbeat Fun](https://www.meetup.com/Offbeat-Fun). (The original Lateral video series is now unlisted on YouTube probably to avoid confusion with its successor, a [weekly podcast of the same name](https://lateralcast.com).)

I wanted to be able to switch between hosting the game and being a player. That meant I needed questions which I didn't know the answers to. After researching sources of pre-made trivia question, it was clear that the best were from Jeopardy. Thanks to a devoted fanbase, more than 500,000 questions from nearly 40 years on air are available online at [J Archive](https://j-archive.com).

I began the project using [JService](https://github.com/sottenad/jService), a web API to J Archive, which gave responses in JSON. Since Javascript was the quickest JSON parser to set up, I started writing the game with Javascript in a web browser. JService shut down in December 2023 but to this day the project is based on HTML and Javascript. Questions now come directly from J Archive with a few steps of copying and pasting.

## Startup sequence

To set up two web browser windows which communicate with each other, the user opens the operator window which automatically opens the presentation window:

<!-- https://mermaid.js.org/syntax/sequenceDiagram.html -->
```mermaid
sequenceDiagram
    actor User

    create participant Operator window
    User ->> Operator window: Open operator.html
    note over Operator window: Create Operator instance and<br>assign it to a global variable

    create participant Presentation window
    Operator window ->> Presentation window: Open presentation.html
    Presentation window ->> Operator window: Read the Operator instance<br>in the Operator window<br>using window.opener
    Operator window ->> Presentation window: 
    note over Presentation window: Create Presentation instance
    Presentation window ->> Operator window: Call Operator.onPresentationReady()<br>and pass the Presentation instance
    
    Operator window ->> User: Display "ready"
```

The way I'm doing it is bad in Typescript because [type assertions](https://www.typescriptlang.org/docs/handbook/2/everyday-types.html#type-assertions) (the `as` keyword) are needed in two places:

- Adding a global variable in the operator window:  
  `(window as any).operator = new Operator();`
- Accessing the Operator instance from the presentation window:  
  `const operator = (window.opener as any).operator as Operator;`

I tried refactoring to avoid these by using the return value of `window.open()` but it did not work. See [my open Stack Overflow question](https://stackoverflow.com/questions/79232362)!

## State machine

The entire game is run by this state machine:

<p align="center">
<img src="images-for-readme/state-machine-state-diagram.svg" alt="State diagram for state machine" height="400">
</p>

How to read the transition labels: text is always to the right of the arrow (troublesome in a few places). Each label contains up to three parts:

- The transition type followed by type-specific details
- Optional guard condition in square brackets
- Optional onTransition function separated by a forward slash character

The project includes a live state machine visualizer for debugging. In the example video below, the current state is highlighted in bright green while the two previous states & transitions trail behind it in paler greens:

![make this video work once pushed to github dot com](images-for-readme/state-machine-live-visualizer.mkv)

## "Clue" vs "question" vs "answer"

A *clue* contains a category, dollar value, question, and answer.

In the Jeopardy TV show, the host first reads an *answer* out loud then players must respond with a *question*, usually in the form "what is...?" but [not necessarily](https://www.jeopardy.com/jbuzz/behind-scenes/what-are-some-questions-about-jeopardy). When revealing Daily Double clues the host sometimes even [begins by saying "answer:..."](https://www.youtube.com/watch?v=kRCpZoVDx64).

That is confusing so in this project the naming convention is that the host reads a *question* out loud then players respond with an *answer*.

In summary:

<table>
  <tr>
    <th></th>
    <th>Host reads out loud</th>
    <th>Players respond with</th>
  </tr>
  <tr>
    <th>TV show</th>
    <td>answer</td>
    <td>question</td>
  </tr>
  <tr>
    <th>This project</th>
    <td>question</td>
    <td>answer</td>
  </tr>
</table>
