import boto3

ec2 = boto3.client('ec2', region_name='us-east-1')
instance_id = "i-058e26140671b3254"

print("Sending hard reboot to EC2 Instance:", instance_id)
response = ec2.reboot_instances(InstanceIds=[instance_id])
print("Reboot Issued:", response)
