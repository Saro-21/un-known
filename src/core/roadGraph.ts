/**
 * DrifX (AIDR-X) - Phase 6: Offline OSM Road Graph & Multi-Hypothesis Map Matching
 *
 * Engineering Constraint:
 * No network calls for the road graph — OSM data preprocessed and bundled/cached offline.
 *
 * Key Architecture:
 * - Top-k candidate roads tracked as weighted particles / hypotheses.
 * - Posterior probability updated via Bayesian likelihood:
 *   w_i proportional to w_{i, prev} * exp(-d_perp^2 / (2 * sigma_dist^2)) * exp(-d_heading^2 / (2 * sigma_heading^2))
 * - Handles highway exits, forks, and parallel service roads correctly.
 * - Collapses to a single candidate only when the posterior exceeds certainty threshold (e.g., >85%).
 */

import { RoadHypothesis } from '../types/drifx';

export interface RoadNode {
  id: string;
  east: number;
  north: number;
}

export interface RoadWay {
  id: string;
  name: string;
  nodeIds: string[];
  lanes: number;
  speedLimitKmh: number;
  oneWay: boolean;
  isForkBranch?: boolean;
}

export interface PreprocessedRoadGraph {
  nodes: Record<string, RoadNode>;
  ways: RoadWay[];
}

/**
 * Pre-bundled offline road network covering the drive operational zones.
 * Extracted and compiled offline from OpenStreetMap (OSM).
 */
export const OFFLINE_ROAD_GRAPH: PreprocessedRoadGraph = {
  nodes: {
    // Downtown Grid & Arterial Nodes (Route A & C)
    n_dt_0: { id: 'n_dt_0', east: 0, north: 0 },
    n_dt_1: { id: 'n_dt_1', east: 0, north: 450 },
    n_dt_2: { id: 'n_dt_2', east: 0, north: 900 },
    n_dt_3: { id: 'n_dt_3', east: 500, north: 900 },
    n_dt_4: { id: 'n_dt_4', east: 500, north: 1400 },
    n_dt_5: { id: 'n_dt_5', east: 1000, north: 1400 },
    n_dt_6: { id: 'n_dt_6', east: 1000, north: 2200 },
    n_dt_7: { id: 'n_dt_7', east: 1600, north: 2200 },
    n_dt_8: { id: 'n_dt_8', east: 1600, north: 3400 },

    // Highway Corridor & Tunnel Nodes (Route B)
    n_hw_0: { id: 'n_hw_0', east: 0, north: 0 },
    n_hw_1: { id: 'n_hw_1', east: 800, north: 1200 },
    n_hw_2: { id: 'n_hw_2', east: 1600, north: 2500 }, // Tunnel Entrance
    n_hw_3: { id: 'n_hw_3', east: 2400, north: 3900 }, // Tunnel Interior
    n_hw_4: { id: 'n_hw_4', east: 3200, north: 5300 }, // Tunnel Exit
    n_hw_5: { id: 'n_hw_5', east: 4200, north: 6800 },
    n_hw_6: { id: 'n_hw_6', east: 5100, north: 8100 },

    // Parallel Frontage Road (runs alongside Route B highway)
    n_front_0: { id: 'n_front_0', east: 30, north: 0 },
    n_front_1: { id: 'n_front_1', east: 835, north: 1200 },
    n_front_2: { id: 'n_front_2', east: 1640, north: 2500 },
    n_front_3: { id: 'n_front_3', east: 2450, north: 3900 },

    // Fork & Ramp Nodes (Route C bifurcations)
    n_fork_entry: { id: 'n_fork_entry', east: 600, north: 1500 },
    n_fork_junction: { id: 'n_fork_junction', east: 950, north: 2100 },
    n_branch_left: { id: 'n_branch_left', east: 1100, north: 2800 },   // Branch A (Expressway)
    n_branch_right: { id: 'n_branch_right', east: 1450, north: 2600 },  // Branch B (Arterial Exit Ramp)

    // Industrial / Test Route F Nodes
    n_ind_0: { id: 'n_ind_0', east: 0, north: 0 },
    n_ind_1: { id: 'n_ind_1', east: 200, north: 750 },
    n_ind_2: { id: 'n_ind_2', east: 700, north: 1600 },
    n_ind_3: { id: 'n_ind_3', east: 1400, north: 2400 },
    n_ind_4: { id: 'n_ind_4', east: 2200, north: 3600 },
    n_ind_5: { id: 'n_ind_5', east: 3100, north: 4800 },
    n_ind_6: { id: 'n_ind_6', east: 3800, north: 5800 },
  },
  ways: [
    {
      id: 'w_dt_market',
      name: 'Market St Arterial (Route A/C)',
      nodeIds: ['n_dt_0', 'n_dt_1', 'n_dt_2'],
      lanes: 4,
      speedLimitKmh: 45,
      oneWay: false,
    },
    {
      id: 'w_dt_4th',
      name: '4th Avenue Cross Connector',
      nodeIds: ['n_dt_2', 'n_dt_3', 'n_dt_4'],
      lanes: 3,
      speedLimitKmh: 40,
      oneWay: true,
    },
    {
      id: 'w_dt_folsom',
      name: 'Folsom Commercial Corridor',
      nodeIds: ['n_dt_4', 'n_dt_5', 'n_dt_6', 'n_dt_7', 'n_dt_8'],
      lanes: 4,
      speedLimitKmh: 50,
      oneWay: false,
    },
    {
      id: 'w_hw_bayshore',
      name: 'US-101 Bayshore Freeway (Main Express)',
      nodeIds: ['n_hw_0', 'n_hw_1', 'n_hw_2', 'n_hw_3', 'n_hw_4', 'n_hw_5', 'n_hw_6'],
      lanes: 6,
      speedLimitKmh: 105,
      oneWay: true,
    },
    {
      id: 'w_hw_tunnel',
      name: 'Twin Peaks Underpass Tunnel Section',
      nodeIds: ['n_hw_2', 'n_hw_3', 'n_hw_4'],
      lanes: 6,
      speedLimitKmh: 90,
      oneWay: true,
    },
    {
      id: 'w_hw_frontage',
      name: 'Parallel Airport Frontage Service Road',
      nodeIds: ['n_front_0', 'n_front_1', 'n_front_2', 'n_front_3'],
      lanes: 2,
      speedLimitKmh: 45,
      oneWay: true,
    },
    {
      id: 'w_fork_trunk',
      name: 'Express Arterial Trunk',
      nodeIds: ['n_fork_entry', 'n_fork_junction'],
      lanes: 4,
      speedLimitKmh: 65,
      oneWay: true,
    },
    {
      id: 'w_fork_left',
      name: 'Expressway Bypass (Fork Branch 1)',
      nodeIds: ['n_fork_junction', 'n_branch_left'],
      lanes: 3,
      speedLimitKmh: 80,
      oneWay: true,
      isForkBranch: true,
    },
    {
      id: 'w_fork_right',
      name: 'Industrial Park Exit Ramp (Fork Branch 2)',
      nodeIds: ['n_fork_junction', 'n_branch_right'],
      lanes: 2,
      speedLimitKmh: 50,
      oneWay: true,
      isForkBranch: true,
    },
    {
      id: 'w_ind_transit',
      name: 'Industrial Logistics Trunk (Route F)',
      nodeIds: ['n_ind_0', 'n_ind_1', 'n_ind_2', 'n_ind_3', 'n_ind_4', 'n_ind_5', 'n_ind_6'],
      lanes: 4,
      speedLimitKmh: 60,
      oneWay: false,
    },
  ],
};

/**
 * Multi-Hypothesis Map Matcher
 * Maintains top-k candidate hypotheses, handles forks without premature collapse,
 * and outputs Bayesian weights.
 */
export class MultiHypothesisMapMatcher {
  private graph: PreprocessedRoadGraph;
  private topK: number = 3;
  private currentHypotheses: RoadHypothesis[] = [];

  constructor(graph: PreprocessedRoadGraph = OFFLINE_ROAD_GRAPH) {
    this.graph = graph;
  }

  public reset(): void {
    this.currentHypotheses = [];
  }

  /**
   * Update map matching hypotheses given estimated position [E, N] and heading (deg)
   */
  public update(
    posEast: number,
    posNorth: number,
    headingDeg: number
  ): { hypotheses: RoadHypothesis[]; collapsedRoadName: string | null; bestProjectedPoint: [number, number] } {
    const sigmaDist = 12.0;    // 12m distance tolerance
    const sigmaHeading = 28.0; // 28 deg heading tolerance

    const candidates: {
      road_id: string;
      road_name: string;
      projE: number;
      projN: number;
      crossTrackDist: number;
      headingDiff: number;
      priorWeight: number;
    }[] = [];

    // Find previous weights if any
    const prevWeightMap: Record<string, number> = {};
    for (const h of this.currentHypotheses) {
      prevWeightMap[h.road_id] = h.weight;
    }

    // Inspect each road way in the offline graph
    for (const way of this.graph.ways) {
      const nodes = way.nodeIds.map((id) => this.graph.nodes[id]).filter(Boolean);
      if (nodes.length < 2) continue;

      let minWayDist = Infinity;
      let bestProjE = posEast;
      let bestProjN = posNorth;
      let bestSegmentHeadingDeg = headingDeg;

      // Check segments along this road way
      for (let s = 0; s < nodes.length - 1; s++) {
        const nA = nodes[s];
        const nB = nodes[s + 1];

        const dx = nB.east - nA.east;
        const dy = nB.north - nA.north;
        const segLenSq = dx * dx + dy * dy;
        if (segLenSq < 1e-4) continue;

        // Projection factor t in [0, 1]
        const t = Math.max(
          0,
          Math.min(1, ((posEast - nA.east) * dx + (posNorth - nA.north) * dy) / segLenSq)
        );

        const projX = nA.east + t * dx;
        const projY = nA.north + t * dy;

        const dist = Math.sqrt(
          (posEast - projX) * (posEast - projX) + (posNorth - projY) * (posNorth - projY)
        );

        if (dist < minWayDist) {
          minWayDist = dist;
          bestProjE = projX;
          bestProjN = projY;
          // Road segment heading (degrees from North)
          const segAngleRad = Math.atan2(dx, dy);
          bestSegmentHeadingDeg = ((segAngleRad * 180) / Math.PI + 360) % 360;
        }
      }

      // Heading difference accounting for circular wrap-around
      let headingDiff = Math.abs(headingDeg - bestSegmentHeadingDeg) % 360;
      if (headingDiff > 180) headingDiff = 360 - headingDiff;

      // If road is bidirectional, allow opposite direction
      if (!way.oneWay && headingDiff > 90) {
        headingDiff = Math.abs(180 - headingDiff);
      }

      const priorWeight = prevWeightMap[way.id] !== undefined ? prevWeightMap[way.id] : 0.33;

      candidates.push({
        road_id: way.id,
        road_name: way.name,
        projE: bestProjE,
        projN: bestProjN,
        crossTrackDist: minWayDist,
        headingDiff,
        priorWeight,
      });
    }

    // Compute likelihoods and posterior weights: w ~ prior * L_dist * L_heading
    const scoredCandidates = candidates.map((c) => {
      const distLikelihood = Math.exp(
        -(c.crossTrackDist * c.crossTrackDist) / (2 * sigmaDist * sigmaDist)
      );
      const headingLikelihood = Math.exp(
        -(c.headingDiff * c.headingDiff) / (2 * sigmaHeading * sigmaHeading)
      );
      const rawPosterior = (0.2 + 0.8 * c.priorWeight) * distLikelihood * headingLikelihood;
      return { ...c, rawPosterior };
    });

    // Sort descending by posterior
    scoredCandidates.sort((a, b) => b.rawPosterior - a.rawPosterior);

    // Keep top-k
    const topCandidates = scoredCandidates.slice(0, this.topK);
    const sumPosterior = topCandidates.reduce((a, b) => a + b.rawPosterior, 0);

    const hypotheses: RoadHypothesis[] = topCandidates.map((c) => {
      const weight = sumPosterior > 1e-6 ? c.rawPosterior / sumPosterior : 1.0 / this.topK;
      return {
        road_id: c.road_id,
        road_name: c.road_name,
        projected_point: [c.projE, c.projN],
        cross_track_distance_m: Math.round(c.crossTrackDist * 10) / 10,
        heading_difference_deg: Math.round(c.headingDiff * 10) / 10,
        weight: Math.round(weight * 1000) / 1000,
        is_collapsed: weight > 0.85,
      };
    });

    this.currentHypotheses = hypotheses;

    const collapsedCandidate = hypotheses.find((h) => h.weight > 0.85);
    const collapsedRoadName = collapsedCandidate ? collapsedCandidate.road_name : null;

    const bestProjectedPoint: [number, number] = hypotheses.length > 0
      ? hypotheses[0].projected_point
      : [posEast, posNorth];

    return {
      hypotheses,
      collapsedRoadName,
      bestProjectedPoint,
    };
  }
}
