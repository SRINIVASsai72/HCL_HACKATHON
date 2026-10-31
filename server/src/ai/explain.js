
/**
 * Creates an explanation for an AI recommendation.
 *
 * Each factor contains:
 * name: descriptive factor name
 * value: normalized score (0 to 1)
 * weight: importance assigned to the factor
 * contribution: value multiplied by weight
 */

export function makeExplanation(factors, summaryText) {
  if (!Array.isArray(factors)) {
    throw new TypeError("Factors must be an array");
  }

  if (typeof summaryText !== "string") {
    throw new TypeError("Summary must be a string");
  }

  const round3 = (number) =>
    Math.round((number + Number.EPSILON) * 1000) / 1000;

  let totalContribution = 0;

  const explainedFactors = factors.map((factor) => {
    const { name, value, weight } = factor ?? {};

    if (
      typeof name !== "string" ||
      !name.trim() ||
      !Number.isFinite(value) ||
      !Number.isFinite(weight) ||
      value < 0 ||
      value > 1 ||
      weight < 0 ||
      weight > 1
    ) {
      throw new TypeError("Invalid explanation factor");
    }

    const contribution = round3(value * weight);
    totalContribution += contribution;

    return {
      name,
      value,
      weight,
      contribution,
    };
  });

  // Correct final-factor rounding to match the total score.
  if (explainedFactors.length > 0) {
    const preciseTotal = factors.reduce(
      (sum, factor) => sum + factor.value * factor.weight,
      0
    );

    const difference =
      round3(preciseTotal) - round3(totalContribution);

    const last = explainedFactors.at(-1);
    last.contribution = round3(
      last.contribution + difference
    );
  }

  return {
    summary: summaryText,
    factors: explainedFactors,
  };
}
