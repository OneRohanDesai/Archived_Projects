const AWS = require("aws-sdk");
const codepipeline = new AWS.CodePipeline();

exports.handler = async () => {
  await codepipeline.startPipelineExecution({
    name: "aesthete-pipeline"
  }).promise();

  return { statusCode: 200, body: "Pipeline execution started" };
};

