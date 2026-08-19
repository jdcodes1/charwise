import "@testing-library/jest-dom/vitest";

// jsdom does not implement scrollIntoView; Review scrolls the selected file
// into view on navigation, so stub it out for the test environment.
if (!Element.prototype.scrollIntoView) {
  Element.prototype.scrollIntoView = () => {};
}
