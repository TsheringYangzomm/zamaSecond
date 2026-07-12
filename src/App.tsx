import "./App.css";

function App() {
  return (
    <>
      <header className="site-header">
        <a className="brand" href="#top" aria-label="Zama home">
          <img src="assets/zama_logo.png" alt="Zama" />
        </a>

        <nav className="site-nav" aria-label="Main navigation">
          <a href="#farmers">Our Team</a>
          <a href="#how-it-works">How it Works</a>
          <a href="#subscriptions">Subscriptions</a>
          <a href="#meal-kits">Meal Kits</a>
        </nav>

        <div className="header-actions" aria-label="Primary actions">
          <a className="btn btn-ghost" href="#farmers">
            Farm Partner
          </a>
          <a className="btn btn-primary" href="#waitlist">
            Join Waitlist
          </a>
        </div>
      </header>

      <main id="top">
        <section className="hero section-shell" aria-labelledby="hero-title">
          <div className="hero-content">
            <p className="eyebrow">Bhutan's First Farm to Kitchen Delivery</p>
            <h1 id="hero-title">Local Products to your door. No Middleman.</h1>
            <p className="hero-copy">
              Fresh groceries, meal kits, wellness essentials and local farm
              products, delivered when you need them.
            </p>

            <form
              className="waitlist-form"
              id="waitlist"
              aria-label="Join waitlist"
            >
              <label className="sr-only">Email address</label>
              <input
                id="email"
                type="email"
                placeholder="your@email.com"
                required
              />
              <button className="btn btn-primary" type="submit">
                Join Waitlist
              </button>
              <p className="form-status" role="status" aria-live="polite"></p>
            </form>
          </div>

          <div
            className="hero-media"
            aria-label="Fresh groceries and local produce"
          >
            <img
              src="assets/hero.png"
              alt="Fresh produce, grocery bags, and delivery boxes"
            />
            <div className="harvest-note">
              <strong>48 hr</strong>
              <span>farm-to-kitchen freshness</span>
            </div>
          </div>
        </section>

        <section
          className="feature-strip section-shell"
          aria-label="Zama promises"
        >
          <div>
            <span>01</span>
            <p>Farm-to-door Freshness</p>
          </div>
          <div>
            <span>02</span>
            <p>100% locally sourced</p>
          </div>
          <div>
            <span>03</span>
            <p>Doorstep delivery</p>
          </div>
          <div>
            <span>04</span>
            <p>Zero waste packaging</p>
          </div>
        </section>

        <section className="values section-shell" aria-label="Why Zama works">
          <article className="value-card">
            <img src="assets/Frame.png" alt="" aria-hidden="true" />
            <h2>Eat Well</h2>
            <p>
              Seasonal local produce, fresher than supermarkets and grown
              without long storage.
            </p>
          </article>

          <article className="value-card">
            <img src="assets/Frame (1).png" alt="" aria-hidden="true" />
            <h2>Less fuss</h2>
            <p>
              No market runs. No meal planning. No forgotten items. Your kitchen
              runs on autopilot.
            </p>
          </article>

          <article className="value-card">
            <img src="assets/Frame (2).png" alt="" aria-hidden="true" />
            <h2>One box</h2>
            <p>
              Vegetables, meal kits, pharmacy, dairy, and pantry basics sorted
              in one delivery.
            </p>
          </article>
        </section>

        <section
          className="products section-shell"
          id="subscriptions"
          aria-labelledby="products-title"
        >
          <div className="section-heading section-heading-center">
            <p className="section-kicker">Subscriptions</p>
            <h2 id="products-title">Explore what we have</h2>
          </div>

          <article className="product-row">
            <div className="product-art">
              <img
                src="assets/vegetableBox.png"
                alt="Vegetable box with fresh greens"
              />
            </div>
            <div className="product-copy">
              <p className="product-label">Weekly fresh box</p>
              <h3>Vegetable Box</h3>
              <p>
                Farm fresh vegetables, picked with care from Bhutanese hillside
                farms.
              </p>
              <div className="button-row">
                <a className="btn btn-primary" href="#waitlist">
                  Get this box
                </a>
                <a className="btn btn-outline" href="#subscriptions">
                  Explore Varieties
                </a>
              </div>
            </div>
          </article>

          <article className="product-row product-row-reverse">
            <div className="product-art">
              <img
                src="assets/fruit box.png"
                alt="Fruit box with seasonal fruit"
              />
            </div>
            <div className="product-copy">
              <p className="product-label">Peak ripeness</p>
              <h3>Fruit Box</h3>
              <p>
                Seasonal fruits, naturally sweet and sourced at peak ripeness.
              </p>
              <div className="button-row">
                <a className="btn btn-primary" href="#waitlist">
                  Get this box
                </a>
                <a className="btn btn-outline" href="#subscriptions">
                  Explore Varieties
                </a>
              </div>
            </div>
          </article>

          <article className="product-row">
            <div className="product-art">
              <img
                src="assets/grocery box.png"
                alt="Grocery box with pantry essentials"
              />
            </div>
            <div className="product-copy">
              <p className="product-label">Everyday staples</p>
              <h3>Grocery Box</h3>
              <p>
                Everyday pantry essentials: grains, pulses, oils, and spices.
              </p>
              <div className="button-row">
                <a className="btn btn-primary" href="#waitlist">
                  Get this box
                </a>
                <a className="btn btn-outline" href="#subscriptions">
                  Explore Items
                </a>
              </div>
            </div>
          </article>

          <article className="product-row product-row-reverse">
            <div className="product-art">
              <img
                src="assets/mealkit box.png"
                alt="Meal kit box with pre-portioned ingredients"
              />
            </div>
            <div className="product-copy">
              <p className="product-label">Recipes included</p>
              <h3>Meal Kit Box</h3>
              <p>
                Pre-portioned ingredients with recipes, farmer notes, and
                dietician guidance.
              </p>
              <div className="button-row">
                <a className="btn btn-primary" href="#meal-kits">
                  Get this box
                </a>
                <a className="btn btn-outline" href="#meal-kits">
                  Explore Varieties
                </a>
              </div>
            </div>
          </article>

          <article className="product-row">
            <div className="product-art">
              <img
                src="assets/allInOneBox.png"
                alt="All-in-one box with groceries and produce"
              />
            </div>
            <div className="product-copy">
              <p className="product-label">Full kitchen refill</p>
              <h3>All in One Box</h3>
              <p>
                Groceries, vegetables, fruits, meat, pharmacy and supplements,
                everything in a single delivery.
              </p>
              <div className="button-row">
                <a className="btn btn-primary" href="#waitlist">
                  Get this box
                </a>
                <a className="btn btn-outline" href="#subscriptions">
                  See full content
                </a>
              </div>
            </div>
          </article>
        </section>

        <section
          className="meal-kits section-shell"
          id="meal-kits"
          aria-labelledby="meal-title"
        >
          <div className="section-heading split-heading">
            <div>
              <p className="section-kicker">Meal kits</p>
              <h2 id="meal-title">Don't know what to cook?</h2>
              <p>Let us plan it for you.</p>
            </div>
            <a className="btn btn-outline" href="#waitlist">
              See all Meal Kits
            </a>
          </div>

          <div className="kit-grid">
            <article className="kit-card kit-card-yellow">
              <div className="kit-copy">
                <p className="pill">Balanced high fibre</p>
                <h3>Breakfast Kit</h3>
                <p>Eggs, avocado, oats, and greens.</p>
                <strong>From Nu 180/day</strong>
              </div>
              <img
                src="assets/orderkit.png"
                alt="Breakfast meal kit ingredients"
              />
              <a className="btn btn-primary" href="#waitlist">
                Order Kit
              </a>
            </article>

            <article className="kit-card kit-card-green">
              <div className="kit-copy">
                <p className="pill">Family favourite</p>
                <h3>Lunch Kit</h3>
                <p>Rice, local vegetables, cheese, and spices.</p>
                <strong>From Nu 220/day</strong>
              </div>
              <img src="assets/orderkit.png" alt="Lunch meal kit ingredients" />
              <a className="btn btn-primary" href="#waitlist">
                Order Kit
              </a>
            </article>

            <article className="kit-card kit-card-yellow">
              <div className="kit-copy">
                <p className="pill">Quick dinner</p>
                <h3>Dinner Kit</h3>
                <p>Ready-to-cook seasonal meals for busy nights.</p>
                <strong>From Nu 250/day</strong>
              </div>
              <img
                src="assets/orderkit.png"
                alt="Dinner meal kit ingredients"
              />
              <a className="btn btn-primary" href="#waitlist">
                Order Kit
              </a>
            </article>
          </div>

          <aside className="dietician-banner" aria-label="Dietician support">
            <div className="health-mark" aria-hidden="true">
              +
            </div>
            <div>
              <h3>Every kit is designed by our in-house dietician.</h3>
              <p>
                Macros, micronutrients, and your goal are all factored in.
                Members get one-on-one consultations.
              </p>
            </div>
            <a className="btn btn-primary" href="#pricing">
              Learn More
            </a>
          </aside>
        </section>

        <section
          className="process section-shell"
          id="how-it-works"
          aria-labelledby="process-title"
        >
          <div className="section-heading section-heading-center">
            <p className="section-kicker">How it works</p>
            <h2 id="process-title">From farm list to dinner table.</h2>
          </div>

          <div className="process-grid">
            <article className="process-step">
              <h3>Choose.</h3>
              <span>1</span>
              <img src="assets/choose (2).png" alt="Choosing a produce box" />
            </article>
            <article className="process-step">
              <h3>Packed.</h3>
              <span>2</span>
              <img src="assets/packed.png" alt="Packed grocery box" />
            </article>
            <article className="process-step">
              <h3>Delivered.</h3>
              <span>3</span>
              <img
                src="assets/delivered (2).png"
                alt="Delivery arriving at the door"
              />
            </article>
            <article className="process-step">
              <h3>Cook.</h3>
              <span>4</span>
              <img src="assets/cook (2).png" alt="Cooking fresh produce" />
            </article>
            <article className="process-step">
              <h3>Repeat.</h3>
              <span>5</span>
              <img
                src="assets/choose (2).png"
                alt="Choosing the next weekly box"
              />
            </article>
          </div>
        </section>

        <section
          className="top-picks section-shell"
          aria-labelledby="top-picks-title"
        >
          <div className="top-picks-copy">
            <p className="section-kicker">This week's top picks</p>
            <h2 id="top-picks-title">Made with what's fresh now.</h2>
          </div>

          <div className="dish-grid">
            <article className="dish-card">
              <img src="assets/topPick.png" alt="Ema datshi meal kit" />
              <div>
                <h3>Ema Datshi Kit</h3>
                <p>~20 mins</p>
              </div>
            </article>
            <article className="dish-card">
              <img src="assets/topPick.png" alt="Kewa datshi meal kit" />
              <div>
                <h3>Kewa Datshi Kit</h3>
                <p>~35 mins</p>
              </div>
            </article>
            <article className="dish-card">
              <img src="assets/topPick.png" alt="Cabbage fry meal kit" />
              <div>
                <h3>Cabbage Fry Kit</h3>
                <p>~25 mins</p>
              </div>
            </article>
          </div>
        </section>

        <section
          className="farmers section-shell"
          id="farmers"
          aria-labelledby="farmer-title"
        >
          <div className="split-heading section-heading">
            <div>
              <p className="section-kicker">Our farmers</p>
              <h2 id="farmer-title">Every Ingredient has a Name.</h2>
            </div>
            <p>
              Every item on Zama, whether a single carrot or a full kit, comes
              from a named farm. We sell stories, not just produce.
            </p>
          </div>

          <div className="farmer-grid">
            <article className="farmer-card">
              <img src="assets/farmer.png" alt="Farmer Tshewang Dorji" />
              <div>
                <h3>Tshewang Dorji</h3>
                <p>Punakha Valley</p>
                <p>Organic greens and herbs</p>
                <a className="btn btn-outline" href="#farmers">
                  Read his story
                </a>
              </div>
            </article>

            <article className="farmer-card">
              <img src="assets/farmer.png" alt="Farmer Choki Wangmo" />
              <div>
                <h3>Choki Wangmo</h3>
                <p>Thimphu Valley</p>
                <p>Organic vegetables and fruits</p>
                <a className="btn btn-outline" href="#farmers">
                  Read her story
                </a>
              </div>
            </article>

            <article className="farmer-card">
              <img src="assets/farmer.png" alt="Farmer Sonam Lhamo" />
              <div>
                <h3>Sonam Lhamo</h3>
                <p>Paro Valley</p>
                <p>Root vegetables and dairy</p>
                <a className="btn btn-outline" href="#farmers">
                  Read her story
                </a>
              </div>
            </article>

            <article className="farmer-card">
              <img src="assets/farmer.png" alt="Farmer Kinley Norbu" />
              <div>
                <h3>Kinley Norbu</h3>
                <p>Wangdue Valley</p>
                <p>Seasonal fruits and grains</p>
                <a className="btn btn-outline" href="#farmers">
                  Read his story
                </a>
              </div>
            </article>
          </div>

          <div className="section-action">
            <a className="btn btn-outline" href="#farmers">
              Meet more farmers
            </a>
          </div>
        </section>

        <section
          className="pricing section-shell"
          id="pricing"
          aria-labelledby="pricing-title"
        >
          <div className="section-heading">
            <p className="section-kicker">Membership</p>
            <h2 id="pricing-title">Save more, eat better</h2>
          </div>

          <div className="pricing-grid">
            <article className="price-card">
              <p className="plan-name">Free</p>
              <h3>
                Nu 0<span>/month</span>
              </h3>
              <ul>
                <li>Shop all fresh produce</li>
                <li>Order any meal kit</li>
                <li>Daily, weekly, or monthly orders</li>
                <li>Standard delivery fee</li>
              </ul>
              <a className="btn btn-outline" href="#waitlist">
                Start For Free
              </a>
            </article>

            <article className="price-card featured-plan">
              <p className="plan-name">Weekly</p>
              <h3>
                Nu 499<span>/month</span>
              </h3>
              <ul>
                <li>One recurring weekly box</li>
                <li>Priority delivery windows</li>
                <li>Member-only top picks</li>
                <li>Pause anytime</li>
              </ul>
              <a className="btn btn-primary" href="#waitlist">
                Choose Weekly
              </a>
            </article>

            <article className="price-card">
              <p className="plan-name">Family</p>
              <h3>
                Nu 1000<span>/month</span>
              </h3>
              <ul>
                <li>Two boxes per week</li>
                <li>Meal kit swaps included</li>
                <li>Reduced delivery fee</li>
                <li>Dietician tips for every kit</li>
              </ul>
              <a className="btn btn-outline" href="#waitlist">
                Choose Family
              </a>
            </article>

            <article className="price-card">
              <p className="plan-name">Plus</p>
              <h3>
                Nu 1600<span>/month</span>
              </h3>
              <ul>
                <li>Full kitchen refill box</li>
                <li>Free standard delivery</li>
                <li>One-on-one dietician check-ins</li>
                <li>Early access to farmer batches</li>
              </ul>
              <a className="btn btn-outline" href="#waitlist">
                Choose Plus
              </a>
            </article>
          </div>
        </section>

        <section
          className="plan-builder section-shell"
          aria-labelledby="plan-title"
        >
          <div className="plan-copy">
            <p className="section-kicker">Zama app</p>
            <h2 id="plan-title">Build your plan the way you eat.</h2>
            <p>
              Pick your box, set delivery days, swap items, and see the farmer
              story behind each ingredient before it reaches your kitchen.
            </p>
            <div className="store-row">
              <a className="store-badge" href="#waitlist">
                <span>Download on the</span>
                App Store
              </a>
              <a className="store-badge" href="#waitlist">
                <span>Get it on</span>
                Google Play
              </a>
            </div>
          </div>

          <div
            className="app-preview"
            aria-label="Zama mobile ordering preview"
          >
            <div className="app-topbar">
              <span></span>
              <strong>Today</strong>
              <small>Nu 520</small>
            </div>
            <div className="delivery-card">
              <p>Next delivery</p>
              <h3>Vegetable Box + Dinner Kit</h3>
              <span>Friday, 8:00 AM - 10:00 AM</span>
            </div>
            <div className="mini-map">
              <span>Farm</span>
              <i></i>
              <span>Kitchen</span>
            </div>
            <div className="app-list">
              <p>
                <span></span> Punakha greens
              </p>
              <p>
                <span></span> Paro potatoes
              </p>
              <p>
                <span></span> Datshi kit
              </p>
            </div>
          </div>
        </section>
      </main>

      <footer className="site-footer">
        <div>
          <img src="assets/zama_logo.png" alt="Zama" />
          <p>Local products, named farms, and calmer kitchens.</p>
        </div>
        <nav aria-label="Footer navigation">
          <a href="#how-it-works">How it Works</a>
          <a href="#subscriptions">Subscriptions</a>
          <a href="#meal-kits">Meal Kits</a>
          <a href="#farmers">Farmers</a>
        </nav>
        <div>
          <p>Thimphu, Bhutan</p>
          <a href="mailto:hello@zama.bt">hello@zama.bt</a>
        </div>
      </footer>
    </>
  );
}

export default App;
