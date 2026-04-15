pipeline {
    agent any

    environment {
        AWS_REGION  = "ap-south-1"
        ACCOUNT_ID  = "062000001375"
        ECR_REPO    = "${ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com/duemind"
        IMAGE_TAG   = "v${BUILD_NUMBER}"
    }

    stages {

        stage('Verify AWS Identity') {
            steps {
                sh 'aws sts get-caller-identity'
            }
        }

        stage('Build Docker Images') {
            steps {
                sh '''
                    docker build -t backend:${IMAGE_TAG}  ./backend
                    docker build -t frontend:${IMAGE_TAG} ./frontend
                '''
            }
        }

        stage('Login to ECR') {
            steps {
                sh '''
                    aws ecr get-login-password --region ${AWS_REGION} \
                    | docker login \
                        --username AWS \
                        --password-stdin ${ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com
                '''
            }
        }

        stage('Tag & Push to ECR') {
            steps {
                sh '''
                    docker tag backend:${IMAGE_TAG}  ${ECR_REPO}:backend-${IMAGE_TAG}
                    docker tag frontend:${IMAGE_TAG} ${ECR_REPO}:frontend-${IMAGE_TAG}

                    docker push ${ECR_REPO}:backend-${IMAGE_TAG}
                    docker push ${ECR_REPO}:frontend-${IMAGE_TAG}
                '''
            }
        }

        stage('Terraform Deploy') {
            steps {
                sh '''
                    cd terraform/ECS

                    # State is in S3 — init just downloads providers
                    # No state file lives in workspace
                    terraform init -input=false -reconfigure -force-copy

                    # plan first so you can see what will change in logs
                    terraform plan \
                        -var="backend_image=${ECR_REPO}:backend-${IMAGE_TAG}" \
                        -var="frontend_image=${ECR_REPO}:frontend-${IMAGE_TAG}"

                    # apply — will UPDATE service, never recreate
                    terraform apply -auto-approve \
                        -var="backend_image=${ECR_REPO}:backend-${IMAGE_TAG}" \
                        -var="frontend_image=${ECR_REPO}:frontend-${IMAGE_TAG}"
                '''
            }
        }

        stage('Verify Deployment') {
            steps {
                sh '''
                    echo "Waiting 20s for ECS to stabilize..."
                    sleep 20

                    # Check service is running
                    aws ecs describe-services \
                        --cluster duemind-cluster \
                        --services duemind-service \
                        --region ${AWS_REGION} \
                        --query "services[0].{Status:status,Running:runningCount,Desired:desiredCount,TaskDef:taskDefinition}" \
                        --output table
                '''
            }
        }

        stage('Cleanup Docker Images') {
            steps {
                sh '''
                    docker rmi backend:${IMAGE_TAG}              || true
                    docker rmi frontend:${IMAGE_TAG}             || true
                    docker rmi ${ECR_REPO}:backend-${IMAGE_TAG}  || true
                    docker rmi ${ECR_REPO}:frontend-${IMAGE_TAG} || true
                '''
            }
        }
    }

    post {
        success {
            echo """
            ✅ Pipeline SUCCESS
            Backend  → ${ECR_REPO}:backend-${IMAGE_TAG}
            Frontend → ${ECR_REPO}:frontend-${IMAGE_TAG}
            """
        }
        failure {
            echo "❌ Pipeline FAILED — check Console Output above for the failing stage"
        }
        always {
            // DO NOT use cleanWs() here — it wipes terraform state
            // Only clean docker credential cache
            sh 'docker logout || true'
        }
    }
}