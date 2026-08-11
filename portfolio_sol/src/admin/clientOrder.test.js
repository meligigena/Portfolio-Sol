import { describe, expect, it } from "vitest";
import { getAdjacentClients, moveClient } from "../data/clientOrder";

const clients = [
  { id: "rambla", name: "Rambla", slug: "rambla", sortOrder: 0 },
  { id: "aqualand", name: "Aqualand", slug: "aqualand", sortOrder: 1 },
  { id: "el-tori", name: "El Tori", slug: "el-tori", sortOrder: 2, comingSoon: true },
];

describe("client ordering", () => {
  it("moves the last client to the first position without excluding coming-soon clients", () => {
    expect(moveClient(clients, 2, 0).map((client) => client.id)).toEqual([
      "el-tori",
      "rambla",
      "aqualand",
    ]);
  });

  it("moves the first client into the middle", () => {
    expect(moveClient(clients, 0, 1).map((client) => client.id)).toEqual([
      "aqualand",
      "rambla",
      "el-tori",
    ]);
  });

  it("allows a newly appended client to move to position one", () => {
    const withNewClient = [
      ...clients,
      { id: "new-client", name: "New Client", slug: "new-client", sortOrder: 3 },
    ];

    expect(moveClient(withNewClient, 3, 0)[0].id).toBe("new-client");
  });

  it("calculates previous and next from the supplied manual order", () => {
    const reordered = moveClient(clients, 2, 1);

    expect(getAdjacentClients(reordered, "el-tori")).toEqual({
      previousClient: reordered[0],
      nextClient: reordered[2],
    });
  });
});
