#pragma once
#include <filesystem>
#include <optional>
#include <string>
#include <utility>
#include <vector>

namespace heartgcn {
using Vector = std::vector<double>;
using Matrix = std::vector<Vector>;
struct SageParameters { Matrix selfWeights, neighborWeights; Vector selfBias, neighborBias; double negativeSlope = .01; };
Vector meanSageAggregate(const std::vector<Vector>& neighbors, std::optional<size_t> dimension = {});
Vector graphSageUpdate(const Vector& self, const std::vector<Vector>& neighbors, const SageParameters& p);
double weightedLatMse(const Vector& prediction, const Vector& truth, const std::vector<bool>& measured);
double qrsDuration(const Vector& times);
struct Loss { double lat, qrs, total; };
Loss combinedLoss(const Vector& prediction, const Vector& truth, const std::vector<bool>& measured);
Matrix anisotropyTensor(const Vector& fiber, double r = 1.0/3.0);
double virtualEdgeLength(const Vector& edge, const Vector& fiber, double r = 1.0/3.0);
double edgeTravelTime(double length, double speed);
struct Experiment { int nx, ny, source; double speed; std::vector<std::pair<int,int>> coordinates; std::vector<std::vector<std::pair<int,double>>> adjacency; Vector truth; };
Experiment syntheticWavefront(int nx = 12, int ny = 9, int source = 0, double speed = 1.0);
struct Reconstruction { Vector estimate, measuredValues; std::vector<int> measuredIndices; double mae, fraction, noise; };
Reconstruction sparseReconstruction(const Experiment&, double fraction = .5, double noise = 0.0);
struct ValidationCheck { std::string name; bool passed; };
std::vector<ValidationCheck> runValidationSuite();
bool exportArtifacts(const std::filesystem::path& folder, std::string* error = nullptr);
}
