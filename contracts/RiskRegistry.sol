// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

/**
 * @title RiskRegistry
 * @notice On-chain registry for Ethos profile risk scores from Trust Ring Detector
 * @dev Stores collusion risk scores (0-100) for Ethos profile IDs
 *
 * Built for Ethos Vibeathon - Deployed on Base
 */
contract RiskRegistry {
    // Risk score for each profile (0-100)
    mapping(uint256 => uint8) public riskScores;

    // Timestamp of last update for each profile
    mapping(uint256 => uint256) public lastUpdated;

    // Owner who can update scores
    address public owner;

    // Analysis metadata
    string public analysisVersion;
    uint256 public totalProfiles;
    uint256 public lastAnalysisTimestamp;

    // Events
    event RiskScoreUpdated(uint256 indexed profileId, uint8 score, uint256 timestamp);
    event BatchUpdated(uint256 count, uint256 timestamp);
    event OwnershipTransferred(address indexed previousOwner, address indexed newOwner);

    // Errors
    error OnlyOwner();
    error InvalidScore();
    error ArrayLengthMismatch();

    modifier onlyOwner() {
        if (msg.sender != owner) revert OnlyOwner();
        _;
    }

    constructor() {
        owner = msg.sender;
        analysisVersion = "1.0.0";
    }

    /**
     * @notice Update risk score for a single profile
     * @param profileId Ethos profile ID
     * @param score Risk score 0-100
     */
    function updateRiskScore(uint256 profileId, uint8 score) external onlyOwner {
        if (score > 100) revert InvalidScore();

        riskScores[profileId] = score;
        lastUpdated[profileId] = block.timestamp;

        emit RiskScoreUpdated(profileId, score, block.timestamp);
    }

    /**
     * @notice Batch update risk scores for multiple profiles
     * @param profileIds Array of Ethos profile IDs
     * @param scores Array of risk scores (0-100)
     */
    function batchUpdateRiskScores(
        uint256[] calldata profileIds,
        uint8[] calldata scores
    ) external onlyOwner {
        if (profileIds.length != scores.length) revert ArrayLengthMismatch();

        for (uint256 i = 0; i < profileIds.length; i++) {
            if (scores[i] > 100) revert InvalidScore();

            riskScores[profileIds[i]] = scores[i];
            lastUpdated[profileIds[i]] = block.timestamp;
        }

        totalProfiles = profileIds.length;
        lastAnalysisTimestamp = block.timestamp;

        emit BatchUpdated(profileIds.length, block.timestamp);
    }

    /**
     * @notice Get risk score for a profile
     * @param profileId Ethos profile ID
     * @return score Risk score 0-100 (0 if not set)
     */
    function getRiskScore(uint256 profileId) external view returns (uint8) {
        return riskScores[profileId];
    }

    /**
     * @notice Check if a profile is considered high risk (score >= 30)
     * @param profileId Ethos profile ID
     * @return isHighRisk True if score >= 30
     */
    function isHighRisk(uint256 profileId) external view returns (bool) {
        return riskScores[profileId] >= 30;
    }

    /**
     * @notice Get risk level category for a profile
     * @param profileId Ethos profile ID
     * @return level Risk level: 0=minimal, 1=low, 2=medium, 3=high, 4=critical
     */
    function getRiskLevel(uint256 profileId) external view returns (uint8) {
        uint8 score = riskScores[profileId];

        if (score >= 70) return 4; // critical
        if (score >= 50) return 3; // high
        if (score >= 30) return 2; // medium
        if (score >= 10) return 1; // low
        return 0; // minimal
    }

    /**
     * @notice Get batch risk scores for multiple profiles
     * @param profileIds Array of profile IDs
     * @return scores Array of risk scores
     */
    function getBatchRiskScores(
        uint256[] calldata profileIds
    ) external view returns (uint8[] memory) {
        uint8[] memory scores = new uint8[](profileIds.length);

        for (uint256 i = 0; i < profileIds.length; i++) {
            scores[i] = riskScores[profileIds[i]];
        }

        return scores;
    }

    /**
     * @notice Update analysis metadata
     * @param version New version string
     */
    function setAnalysisVersion(string calldata version) external onlyOwner {
        analysisVersion = version;
    }

    /**
     * @notice Transfer ownership to new address
     * @param newOwner New owner address
     */
    function transferOwnership(address newOwner) external onlyOwner {
        address oldOwner = owner;
        owner = newOwner;
        emit OwnershipTransferred(oldOwner, newOwner);
    }
}
