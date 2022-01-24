import AWS, { DynamoDB } from "aws-sdk";
import { QueryInput } from "aws-sdk/clients/dynamodb";

async function main()
{
	console.log('Reading Dynamo db');

	let cred = new AWS.SharedIniFileCredentials(
		{
			profile: 'personal'
		}
	);
	AWS.config.credentials = cred;
	AWS.config.region = 'ap-south-1';

	let recipients = [
		"ops1@gmail.com",
		"ops2@gmail.com",
		"admin@gmail.com",
	];

	let recipientKeys = recipients.map((r: string) => ({ "email": { S: r } }));
	var ddb = new DynamoDB({ apiVersion: '2012-08-10' });

	let params: QueryInput = {
		TableName: 'connectedClientsTable',
		IndexName: 'emailIndex',
		KeyConditionExpression: "email = :emaila",
		ExpressionAttributeValues: {
			":emaila": {
				S: "ops1@gmail.com"
			}
		},
		ProjectionExpression: "email, connectionId"
	};

	let ddbResult = await ddb.query(params).promise();

	console.log('ddbResult : ', ddbResult);
}

main();