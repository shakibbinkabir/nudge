# Nudge v0.7.0 (Pre-Release)

[](https://opensource.org/licenses/MIT)
[](https://www.google.com/search?q=)
[](https://www.google.com/search?q=)

**Your intelligent and sassy sidekick against procrastination.** Nudge is a productivity-focused Chrome extension that transforms your new tab page into a smart, beautiful, and focused workspace designed to keep you on track.

-----

> ✨ **Note:** This is a pre-release version. It's in a stable, usable state, but you may encounter minor issues. Your feedback is highly appreciated\!

## About The Project

Do you ever open a new tab with the intent to be productive, only to find yourself mindlessly drifting to social media or YouTube? Nudge was built to solve this exact problem.

It replaces your default new tab with a dashboard that surfaces your most important tasks. More importantly, it acts as a gentle guardian, intercepting visits to distracting websites and "nudging" you back towards your goals. It's not a harsh blocker; it's a flexible companion that helps you build better Browse habits.

### Screenshots

> *Will be added in the v1.0*

-----

## Key Features

  * ✨ **Dynamic & Inspiring New Tab Page**: A beautiful, auto-refreshing background image to create a calm and focused environment.
  * ✅ **Intelligent Task Prioritization**: A to-do list that automatically sorts your tasks by completion status, priority level, and deadline, ensuring you always see what matters most.
  * 🚫 **Distraction Intervention System**: Define your own list of distracting websites. Nudge will intercept your visit and gently remind you of your priorities.
  * 🧘 **Flexible Snooze Functionality**: Need to visit a blocked site? You can "snooze" the block for a set duration, giving you the flexibility you need.
  * ⚙️ **Dual API Key System**: Choose between an easy, one-click setup using the Nudge API or bring your own Pexels key for unlimited, private access to background images.

-----

## How It Works

Nudge operates on two core principles:

1.  **Reinforce Focus**: By replacing the new tab with your prioritized tasks, it constantly reminds you of your goals, making it easier to stay on track.
2.  **Interrupt Distraction**: By redirecting you from a blacklisted site to an intervention page, it breaks the mindless habit loop of visiting distracting sites and forces a moment of conscious choice.

### The Nudge API (`lab.shakibbinkabir.me`)

To provide beautiful background images without requiring every user to sign up for a developer account, Nudge uses a proxy API hosted at `lab.shakibbinkabir.me`.

  * **How it works**: When you use the "Free API Key" option, the extension communicates with this secure backend. The backend then fetches an image from Pexels using a central API key and sends it back to you.
  * **Rate Limiting**: To ensure fair usage for everyone, this service is rate-limited to **16 background image requests per month** per user. This is typically enough for a fresh background every other day.

-----

## Installation (Pre-Release)

As this is a pre-release, it's not on the Chrome Web Store yet. You can install it manually:

1.  Download the `nudge-v0.7.0.zip` file from the [Releases](https://github.com/shakibbinkabir/nudge/releases) page.
2.  Unzip the downloaded file into a folder on your computer.
3.  Open Google Chrome and navigate to `chrome://extensions`.
4.  Enable **"Developer mode"** using the toggle switch in the top-right corner.
5.  Click the **"Load unpacked"** button.
6.  Select the unzipped folder you created in step 2. The Nudge extension icon should now appear in your extensions bar.

-----

## Configuration & Setup

After installation, open a new tab. You will be prompted to configure the background image source. You have two options, which can be configured on the settings page (click the ⚙️ icon).

#### Option 1: Use the Nudge API (Easy Setup)

1.  In the settings page, under "Option 1," enter your email address and click "Get Verification Code."
2.  Check your email for a 6-digit OTP.
3.  Enter the OTP on the settings page and click "Verify & Save Key."
4.  That's it\! Your extension is ready to fetch backgrounds.

#### Option 2: Use Your Own Pexels Key (BYOK)

1.  Go to [Pexels.com/api/](https://www.pexels.com/api/) and create a free account to get your personal API key.
2.  In the Nudge settings page, under "Option 2," paste your Pexels key into the input field.
3.  Click "Save Pexels Key."
4.  This method gives you 25,000 calls per month, private access and does not use the Nudge API service.

-----

## For Developers (Building from Source)

Interested in contributing? Here’s how to get the project running.

### Nudge Extension

1.  Clone the repository:
    ```sh
    git clone https://github.com/shakibbinkabir/nudge.git
    ```
2.  Follow the **Installation** steps above to load the `nudge` directory as an unpacked extension.


## Roadmap

This pre-release is just the beginning. Here are some features planned for future versions:

  * **v1.0.0:** UI/UX Polish and a guided user onboarding tour and some minor features add/tweak.
  * **v1.1.0:** Data Synchronization across devices using `chrome.storage.sync`.

-----

## Contributing

Contributions are what make the open-source community such an amazing place to learn, inspire, and create. Any contributions you make are **greatly appreciated**.

If you have a suggestion that would make this better, please fork the repo and create a pull request. You can also simply open an issue with the tag "enhancement".

1.  Fork the Project
2.  Create your Feature Branch (`git checkout -b feature/AmazingFeature`)
3.  Commit your Changes (`git commit -m 'Add some AmazingFeature'`)
4.  Push to the Branch (`git push origin feature/AmazingFeature`)
5.  Open a Pull Request

-----

## License

Distributed under the MIT License. See `LICENSE.txt` for more information.

-----

## About the Developer

Hey there, I'm Shakib.

I'm a 20-year-old developer from Bangladesh, running on coffee and about a dozen parallel thought processes, thanks to ADHD. My brain is like a browser with 100 tabs open—all of them playing different music. The "one quick YouTube video" often turns into a two-hour deep dive into anything but the code I'm supposed to be writing.

Standard to-do lists felt like a parent nagging me. I didn't need another list; I needed a *sidekick*. Something that would show up at the exact moment of weakness—when that new tab opens—and sassily ask, "Are you *sure* you want to do that?"

So, I built **Nudge**. It’s less of a tool and more of a digital guardian for chaotic minds like mine.

Nudge is the first major experiment from my digital workshop, the **[Lab by Shakib Bin Kabir](https://lab.shakibbinkabir.me)** (still under construction\!), where I build solutions for the problems I face every day. It's open-source because I know I'm not the only one fighting this battle. If this sounds like you, check out my other projects or contribute on **[GitHub](https://github.com/shakibbinkabir)**.

Want to see what else I'm up to? You can find more on my **[personal site](https://shakibbinkabir.me)**.

Got ideas, questions, or just want to chat about building tools for beautifully chaotic brains? Drop me a line at **[contact@shakibbinkabir.me](mailto:contact@shakibbinkabir.me)**.