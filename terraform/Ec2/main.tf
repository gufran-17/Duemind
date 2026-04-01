
data "aws_ami" "amazon_linux" {
  most_recent = true

  owners = ["amazon"]

  filter {
    name   = "name"
    values = ["amzn2-ami-hvm-*-x86_64-gp2"]
  }
}

# ---------------------------
# VPC
# ---------------------------
resource "aws_vpc" "main" {
  cidr_block           = var.vpc_cidr
  enable_dns_support   = true
  enable_dns_hostnames = true

  tags = {
    Name = "tf-vpc"
  }
}

# ---------------------------
# Internet Gateway
# ---------------------------
resource "aws_internet_gateway" "igw" {
  vpc_id = aws_vpc.main.id

  tags = {
    Name = "tf-igw"
  }
}

# ---------------------------
# Public Subnet
# ---------------------------
resource "aws_subnet" "public_subnet" {
  vpc_id                  = aws_vpc.main.id
  cidr_block              = var.public_subnet_cidr
  availability_zone       = "${var.aws_region}a"
  map_public_ip_on_launch = true

  tags = {
    Name = "tf-public-subnet"
  }
}

# ---------------------------
# Route Table for Public Subnet
# ---------------------------
resource "aws_route_table" "public_rt" {
  vpc_id = aws_vpc.main.id

  tags = {
    Name = "tf-public-rt"
  }
}

resource "aws_route" "internet_route" {
  route_table_id         = aws_route_table.public_rt.id
  destination_cidr_block = "0.0.0.0/0"
  gateway_id             = aws_internet_gateway.igw.id
}

resource "aws_route_table_association" "public_assoc" {
  subnet_id      = aws_subnet.public_subnet.id
  route_table_id = aws_route_table.public_rt.id
}

# ---------------------------
# Generate SSH key locally using Terraform
# ---------------------------
resource "tls_private_key" "ec2_key" {
  algorithm = "RSA"
  rsa_bits  = 4096
}

# Upload public key to AWS as Key Pair
resource "aws_key_pair" "ec2_keypair" {
  key_name   = "tf-keypair"
  public_key = tls_private_key.ec2_key.public_key_openssh
}

# Save private key in local file (same folder)
resource "local_file" "private_key_pem" {
  filename        = "${path.module}/${aws_key_pair.ec2_keypair.key_name}.pem"
  content         = tls_private_key.ec2_key.private_key_pem
  file_permission = "0400"
}

# ---------------------------
# Security Group
# ---------------------------
resource "aws_security_group" "ec2_sg" {
  name        = "tf-ec2-sg"
  description = "Allow SSH and HTTP"
  vpc_id      = aws_vpc.main.id

  ingress {
    description = "SSH"
    from_port   = 22
    to_port     = 22
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  ingress {
    description = "HTTP"
    from_port   = 80
    to_port     = 80
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  ingress {
  from_port   = 3000
  to_port     = 3000
  protocol    = "tcp"
  cidr_blocks = ["0.0.0.0/0"]
}

ingress {
  from_port   = 5000
  to_port     = 5000
  protocol    = "tcp"
  cidr_blocks = ["0.0.0.0/0"]
}

  ingress {
  description = "Jenkins"
  from_port   = 8080
  to_port     = 8080
  protocol    = "tcp"
  cidr_blocks = ["0.0.0.0/0"]
}

  egress {
    description = "All outbound"
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = {
    Name = "tf-ec2-sg"
  }
}

# ---------------------------
# EC2 Instance
# ---------------------------
resource "aws_instance" "ec2" {
  ami                         = data.aws_ami.amazon_linux.id
  instance_type               = var.instance_type
  subnet_id                   = aws_subnet.public_subnet.id
  vpc_security_group_ids      = [aws_security_group.ec2_sg.id]
  associate_public_ip_address = true

  # IMPORTANT: Using Terraform-created keypair
  key_name = aws_key_pair.ec2_keypair.key_name

  tags = {
    Name = "tf-ec2-instance"
  }
}
