# 🖌️ Drawing Board: AWS systems design with Terraform

A personal project to learn Terraform, build serverless workflows, and systems Design with AWS. 

## 🗺️ Overview

![Drawing Board system architecture](drawing-board.png)


## 🎯 Goals of this project

- Provision scalable cloud infrastructure using Terraform and Github Action
- Design secure systems using AWS IAM roles
- Design fault tolerant and monitorable systems using AWS Cloudwatch and SNS
- Build serverless workflows using AWS Lambda, SQS, and S3
- Reduce potential costs by creating a service that archives Cloudwatch Logs

## 🧰 Key skills used

- Terraform
- GitHub Actions
- AWS Lambda
- Amazon SQS and dead-letter queues
- AWS IAM
- Amazon CloudWatch and SNS
- Amazon S3
- Amazon EventBridge
- Docker Compose and nginx

## 💭 Reflection / what I learned

One thing that really separates a person who is new to software engineering and someone with experience is not just making applications and systems, but also making them fault tolerant and secure as well. This project was initially just the sqs queue and database lamdba but I wanted to add some features that would make this system more fault tolerant and monitorable.

### SQS and Dead Letter queue
a pattern that I had but never used when I first made this project was the dead letter queue. In this update I handle this dead letter queue through a retry lambda triggered by a cloudwatch alarm. I orignally had this retry lambda run every 30 minutes but that would be uncessarily running it if it doesnt have anything in the queue, costing me more potential money. A cloudwatch alarm is a better fit because it only is triggered when there are actually messages in the DLQ

### Cloudwatch, SNS, and Archive Lambda
To make this app monitorable I added custom cloudwatch logs to the database lambda and a cloudwatch alarm to SNS when there are more then 5 failed request in a short span of time. Many indie developersdo not think about performance but when working on large scale applications and processes, it is a major concern. I decided that this is a small enough project to where just a simple cloudwatch alarm would do, another container for grafana would be uncessary for now. I do want to work on other larger projects next!

### ✨ Final thoughts
Making an application vs making it well are very different tasks. This project went from just some load balancing containers on a server to a secure, fault tolerant, and monitorable serverless workflow. The skills I gained from this will definietly help me in my Cloud Engieering journey.

## 🚀 Possible next steps

- add a container for Grafana and create dashboards for various custom metrics. use AWS Athena/Glue to get archived logs from s3
- add blue green deployments instead of manual git clone in CICD

