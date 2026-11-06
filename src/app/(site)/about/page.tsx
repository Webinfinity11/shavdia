import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { caps } from "@/lib/text";
import { Icon } from "@/components/icon";
import { getAbout } from "@/lib/site-content";

export const metadata: Metadata = { title: "ჩვენ შესახებ" };

const STORY_PREVIEW = 2;

function lines(text: string) {
  return text.split("\n").map((line) => line.trim()).filter(Boolean);
}

export default async function AboutPage() {
  const about = await getAbout();
  const story = lines(about.story);
  return (
    <main id="content" className="page-shell inner-page">
      <section className="about-hero">
        <div className="about-hero-photo">
          <Image src={about.image} alt={about.title} width={1000} height={1200} sizes="(max-width: 900px) 100vw, 700px" loading="eager" fetchPriority="high" />
        </div>
        <div className="about-hero-card">
          <h1>{about.title}</h1>
          {lines(about.intro).map((line, index) => (
            <p key={index}>{line}</p>
          ))}
        </div>
      </section>

      <section className="about-values" aria-labelledby="values-title">
        <div className="about-values-head">
          <h2 className="section-title" id="values-title">
            {about.featuresTitle}
          </h2>
          <p>{about.featuresSubtitle}</p>
        </div>
        <ol className="about-values-list">
          {about.features.slice(0, 4).map((feature, index) => (
            <li key={index}>
              <span aria-hidden="true">{String(index + 1).padStart(2, "0")}</span>
              <h3>{feature.title}</h3>
              <p>{feature.text}</p>
            </li>
          ))}
        </ol>
      </section>

      {about.photos.length ? (
        <section className="about-photos" aria-label="ფოტოები">
          {about.photos.slice(0, 3).map((image) => (
            <div key={image}>
              <Image src={image} alt="" width={1152} height={1152} sizes="(max-width: 600px) 50vw, 33vw" />
            </div>
          ))}
        </section>
      ) : null}

      <section className="about-story" aria-labelledby="story-title">
        <h2 id="story-title">ჩვენი ისტორია</h2>
        <div className="about-story-text">
          {story.slice(0, STORY_PREVIEW).map((line, index) => (
            <p key={index}>{line}</p>
          ))}
          {story.length > STORY_PREVIEW ? (
            <details className="story-more">
              <summary className="button">სრულად წაკითხვა</summary>
              {story.slice(STORY_PREVIEW).map((line, index) => (
                <p key={index}>{line}</p>
              ))}
            </details>
          ) : null}
        </div>
      </section>

      <section className="about-slogan">
        <p>{about.slogan}</p>
        <Link href="/shop" className="button button-light">
          {caps("იხილეთ კოლექცია")} <Icon name="right" />
        </Link>
      </section>
    </main>
  );
}
