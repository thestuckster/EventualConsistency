export interface InfraDef {
  id: string;
  name: string;
  description: string;
  baseCost: number;
  basePerSec: number;
}

export const INFRASTRUCTURE: InfraDef[] = [
  {
    id: "ec2",
    name: "EC2 Instance",
    description: "ur laptop but in Jeff's basement",
    baseCost: 15,
    basePerSec: 0.5,
  },
  {
    id: "s3",
    name: "S3 Bucket",
    description: "a bucket you will never empty. Ever.",
    baseCost: 100,
    basePerSec: 1.2,
  },
  {
    id: "lambda",
    name: "Lambda Function",
    description: "Serverless! (the servers are just hidden)",
    baseCost: 500,
    basePerSec: 4,
  },
  {
    id: "rds",
    name: "RDS Database",
    description: "goes down during demos. Guaranteed.",
    baseCost: 2000,
    basePerSec: 10,
  },
  {
    id: "iam",
    name: "IAM Role",
    description: "you've locked yourself out 3 times",
    baseCost: 7500,
    basePerSec: 18,
  },
  {
    id: "cloudwatch",
    name: "CloudWatch",
    description: "pages you at 3am about things you can't fix",
    baseCost: 25000,
    basePerSec: 30,
  },
  {
    id: "apigateway",
    name: "API Gateway",
    description: "$0.000035/req x 50B requests = bankruptcy",
    baseCost: 100000,
    basePerSec: 55,
  },
  {
    id: "elasticache",
    name: "ElastiCache",
    description: "caching things you forgot you were caching",
    baseCost: 400000,
    basePerSec: 90,
  },
  {
    id: "eks",
    name: "EKS Cluster",
    description: "Kubernetes. You don't know why. Neither do we.",
    baseCost: 2000000,
    basePerSec: 200,
  },
  {
    id: "vpc",
    name: "VPC",
    description: "spent 3 days on this. Still not sure what it does.",
    baseCost: 10000000,
    basePerSec: 400,
  },
  {
    id: "route53",
    name: "Route 53",
    description: "DNS that costs more than your apartment",
    baseCost: 50000000,
    basePerSec: 800,
  },
  {
    id: "cloudfront",
    name: "CloudFront",
    description: "CDN: Content Definitely Nowhere?",
    baseCost: 200000000,
    basePerSec: 2000,
  },
  {
    id: "bedrock",
    name: "Bedrock AI",
    description: "wrap someone else's AI. Charge 10x. Profit.",
    baseCost: 1000000000,
    basePerSec: 6000,
  },
  {
    id: "useast1",
    name: "us-east-1",
    description: "an entire region. Don't ask why it keeps going down.",
    baseCost: 10000000000,
    basePerSec: 25000,
  },
];

export function infraCost(def: InfraDef, owned: number): number {
  return Math.floor(def.baseCost * Math.pow(1.15, owned));
}
